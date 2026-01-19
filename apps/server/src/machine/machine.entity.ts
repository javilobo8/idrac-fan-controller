export interface Preset {
  id: string;
  name: string;
  fanCurve: { temperature: number; fanSpeed: number }[];
}

export class Machine {
  id: string;
  name: string;
  enabled: boolean;
  cron: string;
  ipmiConfig: {
    host: string;
    user: string;
    password: string;
  };
  fanSpeed: number;
  activePresetId: string | null;
  presets: Preset[];
}
