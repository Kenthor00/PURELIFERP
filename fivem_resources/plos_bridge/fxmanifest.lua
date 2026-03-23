--[[
    ██████╗ ██╗      ██████╗ ███████╗    ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗
    ██╔══██╗██║     ██╔═══██╗██╔════╝    ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝
    ██████╔╝██║     ██║   ██║███████╗    ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  
    ██╔═══╝ ██║     ██║   ██║╚════██║    ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  
    ██║     ███████╗╚██████╔╝███████║    ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗
    ╚═╝     ╚══════╝ ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝
    
    PURE LIFE OS Bridge - FiveM Resource
    Integrazione tablet (ox_inventory) + lb-phone custom app
    Compatibile ESX/QBCore con auto-detect
]]

fx_version 'cerulean'
game 'gta5'

name 'plos_bridge'
author 'PURE LIFE OS'
description 'Bridge per PURE LIFE OS - Tablet ox_inventory + lb-phone app'
version '1.0.0'

lua54 'yes'

-- Dipendenze
dependencies {
    'ox_lib',
    'ox_inventory',
}

-- File condivisi (caricati prima di client/server)
shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
    'shared/utils.lua',
}

-- File client
client_scripts {
    'client/main.lua',
    'client/anim.lua',
    'client/nui.lua',
}

-- File server
server_scripts {
    'server/framework.lua',
    'server/main.lua',
    'server/autolink.lua',
    'server/lbphone.lua',
}

-- NUI (interfaccia browser embedded)
ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
}

-- Export functions
exports {
    -- Client exports
    'OpenPLOS',
    'OpenPLOSTablet',
    'OpenPLOSPhone',
    'ClosePLOS',
    'IsOpen',
    'GetCurrentMode',
}

-- Provide per altri script
provide 'plos_bridge'
