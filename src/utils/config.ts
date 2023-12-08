import config from "../../config/config.json";

interface BaseConfig {
    oauth?: {
        issuer: string
    }
}

interface User {
    name?: string;
    email?: string;
    website?: string;
    image?: string;
    aliases?: string[];
}

export interface Config extends BaseConfig {
    domains: {
        [key: string]: Partial<BaseConfig>
    }
    users: {
        [key: string]: User
    }
}

export function getConfig(): Config {
    return config;
}