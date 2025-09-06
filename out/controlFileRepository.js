"use strict";
// src/controlFileRepository.ts
// Sample implementation for phase 2: parsing and exposing control file metadata
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseControlFile = parseControlFile;
// Sample parser for a control file (simplified)
function parseControlFile(text) {
    // This is a stub. Real implementation should use robust parsing.
    const databases = [];
    const constants = {};
    const defaults = {};
    const programs = [];
    // Example: parse programs section
    const programsMatch = text.match(/programs\s+([\s\S]*?)programs end/i);
    if (programsMatch) {
        const lines = programsMatch[1].split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        for (const line of lines) {
            if (line.endsWith('.4gl')) {
                programs.push(line);
            }
        }
    }
    // Example: parse databases section
    const dbRegex = /connect database\s+(\S+)(?:\s+(mysql:[^\s]+))?\s+as\s+(\S+)([\s\S]*?)(?=connect database|database repository end|$)/gi;
    let dbMatch;
    while ((dbMatch = dbRegex.exec(text)) !== null) {
        const name = dbMatch[1];
        const shorthand = dbMatch[2];
        const alias = dbMatch[3];
        const block = dbMatch[4];
        const config = {};
        let type = 'mysql';
        if (shorthand && shorthand.startsWith('mysql:')) {
            type = 'mysql';
            const parts = shorthand.replace('mysql:', '').split(';');
            for (const part of parts) {
                const [key, value] = part.split('=');
                if (!key || !value) {
                    continue;
                }
                const k = key.trim();
                const v = value.trim();
                config[k] = v;
            }
        }
        // Detect sqlite memory database
        if ((shorthand && shorthand.includes('sqlite::memory:')) || block.includes('sqlite::memory:')) {
            type = 'sqlite';
            config.filename = ':memory:';
        }
        // Parse config lines (long-form)
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        for (const line of lines) {
            if (line.startsWith('type=')) {
                type = line.split('=')[1].trim();
            }
            if (line.startsWith('host=')) {
                config.host = line.split('=')[1].trim();
            }
            if (line.startsWith('port=')) {
                config.port = Number(line.split('=')[1].trim());
            }
            if (line.startsWith('username=')) {
                config.user = line.split('=')[1].replace(/"/g, '').trim();
            }
            if (line.startsWith('password=')) {
                config.password = line.split('=')[1].replace(/"/g, '').trim();
            }
            if (line.startsWith('charset=')) {
                config.charset = line.split('=')[1].trim();
            }
            if (line.startsWith('sqlite::memory:')) {
                type = 'sqlite';
                config.filename = ':memory:';
            }
            if (line.startsWith('database=')) {
                config.database = line.split('=')[1].trim();
            }
        }
        if (!config.database) {
            config.database = name;
        }
        // Parse tables for this database
        const tables = [];
        // Find all use lines for this db
        const useRegex = new RegExp(`use\\s+${alias}\\s+table\\s+(\\S+)(?:\\s+as\\s+(\\S+))?`, 'gi');
        let useMatch;
        while ((useMatch = useRegex.exec(text)) !== null) {
            const tableName = useMatch[1];
            const pseudoName = useMatch[2];
            // Improved: Find the block for this table by splitting the tables section
            const tablesSectionMatch = text.match(/tables\s+([\s\S]*?)tables end/i);
            let tableBlock = '';
            if (tablesSectionMatch) {
                const tablesSection = tablesSectionMatch[1];
                // Split tables section into blocks by 'use' lines
                const tableBlocks = tablesSection.split(/(?=use\s+)/i);
                for (const block of tableBlocks) {
                    const useLineRegex = new RegExp(`^use\\s+${alias}\\s+table\\s+${tableName}(?:\\s+as\\s+${pseudoName || ''})?`, 'i');
                    if (useLineRegex.test(block)) {
                        tableBlock = block;
                        break;
                    }
                }
            }
            const fields = [];
            if (tableBlock) {
                const fieldLines = tableBlock.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('field'));
                for (const fieldLine of fieldLines) {
                    // Example: field name type=... key=... sorted=... ranges=...
                    const fieldMatch = /^field\s+(\S+)(.*)$/i.exec(fieldLine);
                    if (fieldMatch) {
                        const name = fieldMatch[1];
                        const attrStr = fieldMatch[2];
                        const attrs = {};
                        if (attrStr) {
                            const attrRegex = /(type|key|sorted|ranges)=([^\s]+)/g;
                            let attrMatch;
                            while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
                                const k = attrMatch[1];
                                let v = attrMatch[2];
                                if (k === 'sorted') {
                                    v = v === 'true';
                                }
                                if (k === 'ranges') {
                                    v = v.split('|');
                                }
                                attrs[k] = v;
                            }
                        }
                        fields.push({ name, ...attrs });
                    }
                }
            }
            tables.push({ name: tableName, fields });
        }
        databases.push({ name, alias, type, config, tables });
    }
    // Example: parse constants section
    const constantsMatch = text.match(/constants\s+([\s\S]*?)constants end/i);
    if (constantsMatch) {
        const lines = constantsMatch[1].split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        for (const line of lines) {
            const constMatch = /^const\s+(\S+)\.(\S+)\s*=\s*(.+)$/i.exec(line);
            if (constMatch) {
                const name = constMatch[1];
                const type = constMatch[2];
                let value = constMatch[3];
                if (type === 'int' || type === 'float') {
                    value = Number(value);
                }
                constants[name] = value;
            }
        }
    }
    // Example: parse defaults section
    const defaultsMatch = text.match(/defaults\s+([\s\S]*?)defaults end/i);
    if (defaultsMatch) {
        const lines = defaultsMatch[1].split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//'));
        for (const line of lines) {
            const defMatch = /^default\s+(\S+)\.(\S+)\s*=\s*(.+)$/i.exec(line);
            if (defMatch) {
                const name = defMatch[1];
                const type = defMatch[2];
                let value = defMatch[3];
                if (type === 'int' || type === 'float') {
                    value = Number(value);
                }
                defaults[name] = value;
            }
        }
    }
    return {
        databases,
        constants,
        defaults,
        programs
    };
}
//# sourceMappingURL=controlFileRepository.js.map