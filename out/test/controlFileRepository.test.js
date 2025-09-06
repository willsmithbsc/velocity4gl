"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/test/controlFileRepository.test.ts
const controlFileRepository_1 = require("../controlFileRepository");
const assert = __importStar(require("assert"));
const sampleControlFile = `
system
    set appName = "My4GLApp"
system end

data
    connect database memdb sqlite::memory: as memory_db
    connect database rad_4gl_system mysql:host=localhost;dbname=rad_4gl_system;charset=utf8mb4;user=root as short_db
    connect database rad_4gl_system as 4gl_db
        type=mysql
        host=localhost
        port=3306
        username="root"
        password=""
        charset=utf8mb4
data end

tables
    use 4gl_db table program_catalog as cat
        field id type=int key=primary
        field name type=string
    use 4gl_db table users
        field user_id type=int key=primary
        field username type=string
        field email type=string
    use short_db table programs
        field prog_id type=int key=primary
        field prog_name type=string
        field active type=bool
    use memory_db table temp_table
        field temp_id type=int
        field value type=string
        field status type=string
        field flags type=string ranges=on|off|pending
tables end

defaults
    default currency.string = "USD"
    default tax_rate.float = 0.07
defaults end

constants
    const MAX_USERS.int = 1000
    const APP_NAME.string = "My4GLApp"
constants end

programs
    first_program_name.4gl
    second_program_name.4gl
programs end
`;
describe('ControlFileRepository Parser', () => {
    it('should parse all sections correctly', () => {
        const repo = (0, controlFileRepository_1.parseControlFile)(sampleControlFile);
        console.log('Parsed databases:', JSON.stringify(repo.databases, null, 2));
        console.log('Parsed programs:', repo.programs);
        console.log('Parsed constants:', repo.constants);
        console.log('Parsed defaults:', repo.defaults);
        assert.ok(repo.databases.length > 0, 'Databases parsed');
        assert.ok(repo.programs.length === 2, 'Programs parsed');
        assert.ok(repo.constants['MAX_USERS'] === 1000, 'Constants parsed');
        assert.ok(repo.defaults['currency'] === '"USD"', 'Defaults parsed');
        // Check fields
        const db = repo.databases.find(d => d.alias === '4gl_db');
        assert.ok(db, 'Database 4gl_db found');
        const table = db.tables.find(t => t.name === 'users');
        assert.ok(table, 'Table users found');
        const field = table.fields.find(f => f.name === 'username');
        // Accept string, varchar, or varchar(...) as valid types
        assert.ok(field && field.type && (/string|varchar/i.test(field.type)), 'Field username parsed');
    });
});
//# sourceMappingURL=controlFileRepository.test.js.map