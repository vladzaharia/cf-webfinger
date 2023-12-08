import config from '../../config/config.json';
import exampleConfig from '../../config/config.example.json';

describe('Configuration checks', () => {
    it.each([])
})

describe.each([
    ["config.json", config],
    ["config.example.json", exampleConfig]
])('Configuration checks (%p)', (_, config) => {
    it('Should have at least one domain', () => {
        expect(config.domains).toBeDefined();
        expect(Object.keys(config.domains).length).toBeGreaterThan(0);
    });

    it('Should have at least one user', () => {
        expect(config.users).toBeDefined();
        expect(Object.keys(config.users).length).toBeGreaterThan(0);
    });
});