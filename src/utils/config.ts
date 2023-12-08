import config from "../../config/config.json";
import { Config } from "../types/config";

export function getConfig(): Config {
  return config;
}
