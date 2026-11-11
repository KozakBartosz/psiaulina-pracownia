import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',use:{baseURL:'http://127.0.0.1:1420',launchOptions:{channel:'chrome'},viewport:{width:1440,height:1000}},webServer:{command:'npm exec vite preview -- --host 127.0.0.1 --port 1420',url:'http://127.0.0.1:1420',reuseExistingServer:true}});
