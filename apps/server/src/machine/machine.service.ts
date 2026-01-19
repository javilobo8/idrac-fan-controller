import { Injectable } from '@nestjs/common';
import { IPMIClient } from '../ipmi/ipmi.client';
import { MachineRepository } from './machine.repository';
import { Machine } from './machine.entity';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MachineService {
  constructor(private readonly machineRepository: MachineRepository) {}

  async getEnabledMachines(): Promise<Machine[]> {
    return this.machineRepository.findEnabled();
  }

  async create({
    name,
    host,
    user,
    password,
    cron,
  }: {
    name: string;
    host: string;
    user: string;
    password: string;
    cron: string;
  }) {
    const presetId = randomUUID();
    const machine: Machine = {
      id: randomUUID(),
      name,
      enabled: false,
      cron,
      ipmiConfig: {
        host,
        user,
        password,
      },
      fanSpeed: 20,
      activePresetId: presetId,
      presets: [
        {
          id: presetId,
          name: 'Default Preset',
          fanCurve: [
            { temperature: 30, fanSpeed: 10 },
            { temperature: 40, fanSpeed: 30 },
            { temperature: 50, fanSpeed: 50 },
            { temperature: 60, fanSpeed: 70 },
            { temperature: 70, fanSpeed: 90 },
          ],
        },
      ],
    };

    return this.machineRepository.save(machine);
  }
}
