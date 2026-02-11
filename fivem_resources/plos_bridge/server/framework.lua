--[[
    PLOS Bridge - Server Framework
    Auto-detect e wrapper per ESX/QBCore
]]

PLOS = PLOS or {}
PLOS.Server = {}

local Framework = nil
local frameworkType = nil

-- ============================================
-- FRAMEWORK DETECTION
-- ============================================

local function DetectFramework()
    if Config.Framework.force ~= 'auto' then
        if Config.Framework.force == 'esx' then
            Framework = exports[Config.Framework.esxExport]:getSharedObject()
            PLOS.Utils.Debug('Server Framework forzato: ESX')
            return 'esx'
        elseif Config.Framework.force == 'qb' then
            Framework = exports[Config.Framework.qbExport]:GetCoreObject()
            PLOS.Utils.Debug('Server Framework forzato: QBCore')
            return 'qb'
        end
    end
    
    -- Auto-detect
    if GetResourceState(Config.Framework.esxExport) == 'started' then
        Framework = exports[Config.Framework.esxExport]:getSharedObject()
        PLOS.Utils.Debug('Server Framework rilevato: ESX')
        return 'esx'
    elseif GetResourceState(Config.Framework.qbExport) == 'started' then
        Framework = exports[Config.Framework.qbExport]:GetCoreObject()
        PLOS.Utils.Debug('Server Framework rilevato: QBCore')
        return 'qb'
    end
    
    PLOS.Utils.Error('Server: Nessun framework rilevato!')
    return nil
end

CreateThread(function()
    frameworkType = DetectFramework()
    
    if not frameworkType then
        PLOS.Utils.Error('Server PLOS Bridge non può avviarsi senza framework')
        return
    end
    
    PLOS.Utils.Debug('Server PLOS Bridge inizializzato con framework:', frameworkType)
end)

-- ============================================
-- PLAYER DATA WRAPPER
-- ============================================

---@param source number
---@return table|nil
function PLOS.Server.GetPlayer(source)
    if not Framework then return nil end
    
    if frameworkType == 'esx' then
        return Framework.GetPlayerFromId(source)
    elseif frameworkType == 'qb' then
        return Framework.Functions.GetPlayer(source)
    end
    
    return nil
end

---@param source number
---@return string|nil
function PLOS.Server.GetIdentifier(source)
    local player = PLOS.Server.GetPlayer(source)
    if not player then return nil end
    
    if frameworkType == 'esx' then
        return player.identifier
    elseif frameworkType == 'qb' then
        return player.PlayerData.citizenid
    end
    
    return nil
end

---@param source number
---@return string|nil
function PLOS.Server.GetPlayerName(source)
    local player = PLOS.Server.GetPlayer(source)
    if not player then 
        return GetPlayerName(source) 
    end
    
    if frameworkType == 'esx' then
        local pd = player.getPlayer and player:getPlayer() or player
        if pd.firstName and pd.lastName then
            return pd.firstName .. ' ' .. pd.lastName
        end
        return player.getName and player:getName() or GetPlayerName(source)
    elseif frameworkType == 'qb' then
        local charinfo = player.PlayerData.charinfo
        if charinfo then
            return charinfo.firstname .. ' ' .. charinfo.lastname
        end
    end
    
    return GetPlayerName(source)
end

---@param source number
---@return table
function PLOS.Server.GetJob(source)
    local player = PLOS.Server.GetPlayer(source)
    local defaultJob = { name = 'unemployed', label = 'Disoccupato', grade = 0, gradeLabel = 'Nessuno' }
    
    if not player then return defaultJob end
    
    if frameworkType == 'esx' then
        local job = player.getJob and player:getJob() or (player.job or defaultJob)
        return {
            name = job.name or 'unemployed',
            label = job.label or 'Disoccupato',
            grade = job.grade or 0,
            gradeLabel = job.grade_label or 'Nessuno',
            duty = job.onDuty ~= nil and job.onDuty or true,
        }
    elseif frameworkType == 'qb' then
        local job = player.PlayerData.job
        if not job then return defaultJob end
        return {
            name = job.name or 'unemployed',
            label = job.label or 'Disoccupato',
            grade = job.grade and job.grade.level or 0,
            gradeLabel = job.grade and job.grade.name or 'Nessuno',
            duty = job.onduty or false,
        }
    end
    
    return defaultJob
end

---@param source number
---@return table
function PLOS.Server.GetFullPlayerData(source)
    return {
        identifier = PLOS.Server.GetIdentifier(source),
        name = PLOS.Server.GetPlayerName(source),
        job = PLOS.Server.GetJob(source),
        source = source,
    }
end

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

---@return string
function PLOS.Server.GetFrameworkType()
    return frameworkType
end

---@return any
function PLOS.Server.GetFramework()
    return Framework
end

---@param source number
---@param itemName string
---@return boolean
function PLOS.Server.HasItem(source, itemName)
    if GetResourceState('ox_inventory') == 'started' then
        local count = exports.ox_inventory:Search(source, 'count', itemName)
        return count and count > 0
    end
    
    -- Fallback framework inventory
    local player = PLOS.Server.GetPlayer(source)
    if not player then return false end
    
    if frameworkType == 'esx' then
        local item = player.getInventoryItem and player:getInventoryItem(itemName)
        return item and item.count > 0
    elseif frameworkType == 'qb' then
        local item = player.Functions.GetItemByName(itemName)
        return item and item.amount > 0
    end
    
    return false
end

-- ============================================
-- EXPORTS
-- ============================================

exports('GetPlayer', PLOS.Server.GetPlayer)
exports('GetIdentifier', PLOS.Server.GetIdentifier)
exports('GetPlayerName', PLOS.Server.GetPlayerName)
exports('GetJob', PLOS.Server.GetJob)
exports('GetFullPlayerData', PLOS.Server.GetFullPlayerData)
exports('GetFrameworkType', PLOS.Server.GetFrameworkType)
exports('HasItem', PLOS.Server.HasItem)
