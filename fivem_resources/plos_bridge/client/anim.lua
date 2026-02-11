--[[
    PLOS Bridge - Client Animation
    Gestione animazioni e props per tablet
]]

-- State
local tabletProp = nil
local isAnimating = false

-- ============================================
-- PROP MANAGEMENT
-- ============================================

local function LoadModel(model)
    local hash = type(model) == 'string' and GetHashKey(model) or model
    
    if not IsModelValid(hash) then
        PLOS.Utils.Error('Modello non valido:', model)
        return false
    end
    
    RequestModel(hash)
    
    local timeout = 5000
    local start = GetGameTimer()
    
    while not HasModelLoaded(hash) do
        if GetGameTimer() - start > timeout then
            PLOS.Utils.Error('Timeout caricamento modello:', model)
            return false
        end
        Wait(10)
    end
    
    return true
end

local function LoadAnimDict(dict)
    if not DoesAnimDictExist(dict) then
        PLOS.Utils.Error('AnimDict non esiste:', dict)
        return false
    end
    
    RequestAnimDict(dict)
    
    local timeout = 5000
    local start = GetGameTimer()
    
    while not HasAnimDictLoaded(dict) do
        if GetGameTimer() - start > timeout then
            PLOS.Utils.Error('Timeout caricamento AnimDict:', dict)
            return false
        end
        Wait(10)
    end
    
    return true
end

local function CreateTabletProp()
    local ped = PlayerPedId()
    local propModel = Config.Tablet.propModel
    
    if not LoadModel(propModel) then
        return nil
    end
    
    local coords = GetEntityCoords(ped)
    local prop = CreateObject(
        GetHashKey(propModel),
        coords.x, coords.y, coords.z,
        true, true, true
    )
    
    if not DoesEntityExist(prop) then
        PLOS.Utils.Error('Impossibile creare prop tablet')
        return nil
    end
    
    -- Attach al player
    local offset = Config.Tablet.offset
    AttachEntityToEntity(
        prop,
        ped,
        GetPedBoneIndex(ped, Config.Tablet.bone),
        offset.x, offset.y, offset.z,
        offset.rx, offset.ry, offset.rz,
        true, true, false, true, 1, true
    )
    
    -- Imposta come mission entity per evitare despawn
    SetEntityAsMissionEntity(prop, true, true)
    
    PLOS.Utils.Debug('Prop tablet creato:', prop)
    return prop
end

local function DeleteTabletProp()
    if tabletProp and DoesEntityExist(tabletProp) then
        DetachEntity(tabletProp, true, true)
        DeleteEntity(tabletProp)
        PLOS.Utils.Debug('Prop tablet eliminato')
    end
    tabletProp = nil
end

-- ============================================
-- ANIMATION MANAGEMENT
-- ============================================

local function PlayTabletAnimation()
    local ped = PlayerPedId()
    local anim = Config.Tablet.animation
    
    if not LoadAnimDict(anim.dict) then
        return false
    end
    
    TaskPlayAnim(
        ped,
        anim.dict,
        anim.name,
        8.0,     -- blend in speed
        -8.0,    -- blend out speed
        -1,      -- duration (-1 = loop)
        anim.flag,
        0,       -- playback rate
        false,   -- lockX
        false,   -- lockY
        false    -- lockZ
    )
    
    PLOS.Utils.Debug('Animazione tablet avviata')
    return true
end

local function StopAnimation()
    local ped = PlayerPedId()
    local anim = Config.Tablet.animation
    
    StopAnimTask(ped, anim.dict, anim.name, 1.0)
    
    -- Pulizia animdict dalla memoria
    RemoveAnimDict(anim.dict)
    
    PLOS.Utils.Debug('Animazione tablet fermata')
end

-- ============================================
-- PUBLIC FUNCTIONS
-- ============================================

function StartTabletAnimation()
    if isAnimating then
        PLOS.Utils.Debug('Animazione già in corso')
        return false
    end
    
    isAnimating = true
    
    -- Crea prop
    tabletProp = CreateTabletProp()
    
    -- Avvia animazione
    if Config.Tablet.allowMovement then
        -- Se movimento permesso, usa flag diverso o nessuna animazione
        PLOS.Utils.Debug('Movimento permesso, animazione ridotta')
    else
        PlayTabletAnimation()
    end
    
    -- Freeze player se richiesto
    if not Config.Tablet.allowMovement then
        local ped = PlayerPedId()
        SetEntityHeading(ped, GetEntityHeading(ped))
    end
    
    return true
end

function StopTabletAnimation()
    if not isAnimating then
        return false
    end
    
    -- Ferma animazione
    StopAnimation()
    
    -- Elimina prop
    DeleteTabletProp()
    
    -- Unfreeze player
    local ped = PlayerPedId()
    ClearPedTasks(ped)
    
    isAnimating = false
    
    return true
end

-- ============================================
-- EXPORTS
-- ============================================

exports('IsAnimating', function() return isAnimating end)
exports('GetTabletProp', function() return tabletProp end)

-- ============================================
-- CLEANUP ON RESOURCE STOP
-- ============================================

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    
    if isAnimating then
        StopTabletAnimation()
    end
end)

-- ============================================
-- CLEANUP ON PLAYER DEATH/RESPAWN
-- ============================================

AddEventHandler('baseevents:onPlayerDied', function()
    if isAnimating then
        StopTabletAnimation()
        ClosePLOS()
    end
end)

AddEventHandler('esx:onPlayerDeath', function()
    if isAnimating then
        StopTabletAnimation()
        ClosePLOS()
    end
end)

-- QBCore death
RegisterNetEvent('hospital:client:RespawnAtHospital', function()
    if isAnimating then
        StopTabletAnimation()
        ClosePLOS()
    end
end)
