import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IPMIClient } from '../ipmi/ipmi.client';
import { MachineRepository } from './machine.repository';

@Injectable()
export class MachineApplyService {
  private readonly logger = new Logger(MachineApplyService.name);

  constructor(private readonly machineRepository: MachineRepository) {}

  async execute(machineId: string): Promise<void> {
    this.logger.log(`Running for machine ID: ${machineId}`);

    const machine = this.machineRepository.findById(machineId);
    if (!machine) {
      throw new Error('Machine not found');
    }

    if (!machine.enabled) {
      return;
    }

    const client = new IPMIClient(machine.ipmiConfig);

    const result = await client.getTemperatures();

    if (machine.activePresetId) {
      const preset = machine.presets.find(
        (p) => p.id === machine.activePresetId,
      );
      if (!preset) {
        throw new Error('Active preset not found on machine');
      }

      const cpuTemps = result.filter((t) => t.sensor === 'Temp');
      const maxTemp = Math.max(...cpuTemps.map((t) => t.degrees));
      this.logger.log(`Max CPU Temperature: ${maxTemp}°C`);

      let targetFanSpeed = 20;
      for (const point of preset.fanCurve) {
        if (maxTemp >= point.temperature) {
          targetFanSpeed = point.fanSpeed;
        }
      }

      this.logger.log(`Setting fan speed to ${targetFanSpeed}%`);
      await client.toggleFanControl(false);
      await client.setFanSpeed(targetFanSpeed);
    } else {
      this.logger.log(`Setting fan speed to ${machine.fanSpeed}%`);
      await client.toggleFanControl(false);
      await client.setFanSpeed(machine.fanSpeed);
    }
  }
}
