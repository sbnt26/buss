import { OrganizationUpdateSchema } from '../lib/schemas/organization';
import { readFileSync } from 'fs';

const payload = JSON.parse(readFileSync(0, 'utf-8'));
const result = OrganizationUpdateSchema.safeParse(payload);
console.log(JSON.stringify(result, null, 2));
