import config from "../../config/config.json";

interface BaseConfig {
    oauth: {
        issuer: string
    }
}

export interface Config extends BaseConfig {
    domains: {
        [key: string]: Partial<BaseConfig>
    }
}

export function getConfig(): Config {
    return config;
}