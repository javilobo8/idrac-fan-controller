import { Injectable, OnModuleInit } from '@nestjs/common';

import * as fs from 'fs';
import { Machine } from './machine.entity';

@Injectable()
export class MachineRepository implements OnModuleInit {
  private CONFIGURATIONS_FILE = 'machines.json';
  private configurations: Map<string, Machine> = new Map();

  onModuleInit() {
    this.loadConfigurations();
  }

  private loadConfigurations() {
    if (!fs.existsSync(this.CONFIGURATIONS_FILE)) {
      fs.writeFileSync(this.CONFIGURATIONS_FILE, '[]', 'utf-8');
    }

    const data = fs.readFileSync(this.CONFIGURATIONS_FILE, 'utf-8');
    const configs: Machine[] = JSON.parse(data);

    configs.forEach((config) => {
      this.configurations.set(config.id, config);
    });
  }

  private persistConfigurations() {
    const data = JSON.stringify(
      Array.from(this.configurations.values()),
      null,
      2,
    );
    fs.writeFileSync(this.CONFIGURATIONS_FILE, data, 'utf-8');
  }

  public save(machine: Machine): Machine {
    this.configurations.set(machine.id, machine);
    this.persistConfigurations();
    return machine;
  }

  findById(id: string): Machine | undefined {
    return this.configurations.get(id);
  }

  findAll(): Machine[] {
    return Array.from(this.configurations.values());
  }

  findEnabled(): Machine[] {
    return Array.from(this.configurations.values()).filter(
      (config) => config.enabled,
    );
  }
}
