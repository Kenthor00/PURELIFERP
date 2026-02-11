--[[
    PLOS Bridge - Shared Utilities
    Funzioni condivise tra client e server
]]

PLOS = PLOS or {}
PLOS.Utils = {}

-- ============================================
-- DEBUG LOGGING
-- ============================================

---@param ... any
function PLOS.Utils.Debug(...)
    if not Config.Debug.enabled then return end
    local args = {...}
    local message = '[PLOS Bridge] '
    for i, v in ipairs(args) do
        message = message .. tostring(v) .. ' '
    end
    print(message)
end

---@param ... any
function PLOS.Utils.Error(...)
    local args = {...}
    local message = '^1[PLOS Bridge ERROR]^0 '
    for i, v in ipairs(args) do
        message = message .. tostring(v) .. ' '
    end
    print(message)
end

---@param ... any
function PLOS.Utils.Warn(...)
    local args = {...}
    local message = '^3[PLOS Bridge WARN]^0 '
    for i, v in ipairs(args) do
        message = message .. tostring(v) .. ' '
    end
    print(message)
end

-- ============================================
-- STRING UTILITIES
-- ============================================

---@param str string
---@param maxLen number
---@return string
function PLOS.Utils.TruncateString(str, maxLen)
    if type(str) ~= 'string' then return '' end
    maxLen = maxLen or Config.Security.validation.maxStringLength
    if #str > maxLen then
        return string.sub(str, 1, maxLen)
    end
    return str
end

---@param str string
---@return string
function PLOS.Utils.SanitizeString(str)
    if type(str) ~= 'string' then return '' end
    -- Rimuovi caratteri potenzialmente pericolosi
    str = str:gsub('[<>"\']', '')
    return PLOS.Utils.TruncateString(str)
end

---@param str string|nil
---@return boolean
function PLOS.Utils.IsValidString(str)
    return type(str) == 'string' and #str > 0
end

-- ============================================
-- NUMBER UTILITIES
-- ============================================

---@param num number
---@param min number
---@param max number
---@return number
function PLOS.Utils.Clamp(num, min, max)
    if type(num) ~= 'number' then return min end
    return math.max(min, math.min(max, num))
end

---@param x number
---@param y number
---@return boolean
function PLOS.Utils.ValidateCoords(x, y)
    local maxVal = Config.Security.validation.maxCoordValue
    if type(x) ~= 'number' or type(y) ~= 'number' then
        return false
    end
    if math.abs(x) > maxVal or math.abs(y) > maxVal then
        return false
    end
    return true
end

-- ============================================
-- TABLE UTILITIES
-- ============================================

---@param tbl table
---@return table
function PLOS.Utils.DeepCopy(tbl)
    if type(tbl) ~= 'table' then return tbl end
    local copy = {}
    for k, v in pairs(tbl) do
        if type(v) == 'table' then
            copy[k] = PLOS.Utils.DeepCopy(v)
        else
            copy[k] = v
        end
    end
    return copy
end

---@param tbl table
---@return string
function PLOS.Utils.TableToString(tbl)
    if type(tbl) ~= 'table' then return tostring(tbl) end
    local result = '{'
    local first = true
    for k, v in pairs(tbl) do
        if not first then result = result .. ', ' end
        first = false
        if type(k) == 'string' then
            result = result .. k .. '='
        end
        if type(v) == 'table' then
            result = result .. PLOS.Utils.TableToString(v)
        elseif type(v) == 'string' then
            result = result .. '"' .. v .. '"'
        else
            result = result .. tostring(v)
        end
    end
    return result .. '}'
end

-- ============================================
-- RANDOM UTILITIES
-- ============================================

---@param length number
---@return string
function PLOS.Utils.GenerateCode(length)
    length = length or 32
    local chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    local code = ''
    for i = 1, length do
        local idx = math.random(1, #chars)
        code = code .. chars:sub(idx, idx)
    end
    return code
end

---@return string
function PLOS.Utils.GenerateUUID()
    local template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return string.gsub(template, '[xy]', function(c)
        local v = (c == 'x') and math.random(0, 0xf) or math.random(8, 0xb)
        return string.format('%x', v)
    end)
end

-- ============================================
-- TIME UTILITIES
-- ============================================

---@return number
function PLOS.Utils.GetTimestamp()
    return os.time()
end

---@param timestamp number
---@return string
function PLOS.Utils.FormatTimestamp(timestamp)
    return os.date('%Y-%m-%d %H:%M:%S', timestamp)
end

-- ============================================
-- VALIDATION
-- ============================================

---@param mode string
---@return boolean
function PLOS.Utils.ValidateMode(mode)
    return mode == 'tablet' or mode == 'phone'
end

---@param action string
---@return boolean
function PLOS.Utils.ValidateNuiAction(action)
    local validActions = {
        'PLOS_GET_PLAYER',
        'PLOS_SET_WAYPOINT',
        'PLOS_NOTIFY',
        'PLOS_HANDSHAKE',
        'PLOS_CLOSE',
    }
    for _, valid in ipairs(validActions) do
        if action == valid then
            return true
        end
    end
    return false
end

-- ============================================
-- EVENT NAMES (centralizzati)
-- ============================================

PLOS.Events = {
    -- Client events
    OPEN_TABLET = 'plos:openTablet',
    OPEN_PHONE = 'plos:openPhone',
    CLOSE = 'plos:close',
    PUSH_NOTIFICATION = 'plos:pushNotification',
    REFRESH_PLAYER = 'plos:refreshPlayerContext',
    
    -- Server events
    REQUEST_HANDSHAKE = 'plos:server:requestHandshake',
    HANDSHAKE_RESPONSE = 'plos:client:handshakeResponse',
    LOG_ACTION = 'plos:server:logAction',
    
    -- Internal
    USE_ITEM = 'plos:useItem',
}

-- ============================================
-- NOTIFICATION TYPES
-- ============================================

PLOS.NotifyTypes = {
    SUCCESS = 'success',
    ERROR = 'error',
    INFO = 'info',
    WARNING = 'warning',
}

return PLOS
