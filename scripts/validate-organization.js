const fs = require('fs');
const path = require('path');
const { OrganizationUpdateSchema } = require('../lib/schemas/organization');

const payload = JSON.parse(fs.readFileSync(0, 'utf-8'));
const result = OrganizationUpdateSchema.safeParse(payload);
console.log(JSON.stringify(result, null, 2));
