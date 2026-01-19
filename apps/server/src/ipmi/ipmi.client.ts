import { Logger } from '@nestjs/common';
import { execa } from 'execa';

export interface IPMIClientOptions {
  host: string;
  user: string;
  password: string;
}

export interface TemperatureReading {
  sensor: string;
  identifier: string;
  status: string;
  degrees: number;
  units: string;
}

export interface FanReading {
  sensor: string;
  identifier: string;
  status: string;
  rpm: number;
  units: string;
}

export interface PowerSupplyReading {
  sensor: string;
  identifier: string;
  status: string;
  value: string;
}

export interface PowerConsumption {
  currentWatts: number;
  minimumWatts: number;
  maximumWatts: number;
  averageWatts: number;
}

export interface ChassisStatus {
  powerOn: boolean;
  powerOverload: boolean;
  powerInterlock: boolean;
  powerFault: boolean;
  powerControlFault: boolean;
  lastPowerEvent: string;
  chassisIntrusion: string;
}

export interface SensorReading {
  sensor: string;
  value: string;
  units: string;
  status: string;
}

export class IPMIClient {
  private logger = new Logger(IPMIClient.name);

  constructor(private config: IPMIClientOptions) {}

  private getAuthParams() {
    return [
      '-I',
      'lanplus',
      '-H',
      this.config.host,
      '-U',
      this.config.user,
      '-P',
      this.config.password,
    ];
  }

  private async exec(args: string[]) {
    const commandArgs = [...this.getAuthParams(), ...args];
    this.logger.log(`ipmitool ${commandArgs.join(' ')}`);
    return execa('ipmitool', commandArgs);
  }

  private parseTemperatureLine(line: string): TemperatureReading | undefined {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length === 5) {
      const [degrees, units] = parts[4].split('degrees').map((p) => p.trim());
      return {
        sensor: parts[0],
        identifier: parts[1],
        status: parts[2],
        degrees: parseFloat(degrees),
        units: units,
      };
    }
  }

  public getTemperaturesFromRaw() {
    /**
Pwr Consumption  | 77h
Temp             | 0Eh
Temp             | 0Fh
Inlet Temp       | 04h
Exhaust Temp     | 01h
     */

    const readings = [
      {
        label: 'CPU0 Temp',
        address: '0x0e',
        convert: (value: number) => value * 0.27,
      },
      {
        label: 'CPU1 Temp',
        address: '0x0f',
        convert: (value: number) => value * 0.27,
      },
      {
        label: 'Inlet Temp',
        address: '0x04',
        convert: (value: number) => value * 0.27,
      },
      {
        label: 'Exhaust Temp',
        address: '0x01',
        convert: (value: number) => value * 0.27,
      },
    ];

    return Promise.all(
      readings.map(async (reading) => {
        const result = await this.exec([
          'raw',
          '0x04',
          '0x2d',
          reading.address,
        ]);
        const output = result.stdout;
        const hexValue = output.split(' ')[2];
        const tempC = parseInt(hexValue, 16);
        return {
          sensor: reading.label,
          identifier: reading.address,
          status: 'ok',
          degrees: reading.convert(tempC),
          units: 'degrees C',
        } as TemperatureReading;
      }),
    );
  }

  public async getTemperatures() {
    const result = await this.exec(['sdr', 'type', 'temperature']);

    const temperatures: TemperatureReading[] = [];

    for (const line of result.stdout.split('\n')) {
      if (!line.includes('degrees')) continue;
      const reading = this.parseTemperatureLine(line);
      if (reading) {
        temperatures.push(reading);
      }
    }

    return temperatures;
  }

  public async toggleFanControl(value: boolean) {
    const command = value ? '0x01' : '0x00';

    this.logger.log(
      `Setting fan control to ${value ? 'automatic (Dell)' : 'manual'}`,
    );

    await this.exec(['raw', '0x30', '0x30', '0x01', command]);
  }

  public async setFanSpeed(speed: number) {
    const value = parseInt(speed.toString(), 10);

    if (value < 0 || value > 100) {
      throw new Error('Fan speed must be between 0 and 100');
    }

    const command = `0x${value.toString(16).padStart(2, '0')}`;
    this.logger.log(`Setting fan speed to ${value}%`);

    await this.exec(['raw', '0x30', '0x30', '0x02', '0xff', command]);
  }

  public async getFanSpeeds() {
    const result = await this.exec(['sdr', 'type', 'Fan']);

    const fans: FanReading[] = [];

    for (const line of result.stdout.split('\n')) {
      if (!line.includes('RPM')) continue;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length === 5) {
        const [rpm, units] = parts[4].split('RPM').map((p) => p.trim());
        fans.push({
          sensor: parts[0],
          identifier: parts[1],
          status: parts[2],
          rpm: parseFloat(rpm),
          units: 'RPM',
        });
      }
    }

    return fans;
  }

  public async getPowerSupplies() {
    const result = await this.exec(['sdr', 'type', 'Power Supply']);

    const powerSupplies: PowerSupplyReading[] = [];

    for (const line of result.stdout.split('\n')) {
      if (line.trim().length === 0) continue;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 4) {
        powerSupplies.push({
          sensor: parts[0],
          identifier: parts[1],
          status: parts[2],
          value: parts[3] || '',
        });
      }
    }

    return powerSupplies;
  }

  public async getPowerConsumption(): Promise<PowerConsumption> {
    const result = await this.exec(['dcmi', 'power', 'reading']);

    const output = result.stdout;
    const currentMatch = output.match(/Current Power\s+:\s+(\d+)\s+Watts/);
    const minMatch = output.match(
      /Minimum Power over sampling duration\s+:\s+(\d+)\s+Watts/,
    );
    const maxMatch = output.match(
      /Maximum Power over sampling duration\s+:\s+(\d+)\s+Watts/,
    );
    const avgMatch = output.match(
      /Average Power over sampling duration\s+:\s+(\d+)\s+Watts/,
    );

    return {
      currentWatts: currentMatch ? parseInt(currentMatch[1]) : 0,
      minimumWatts: minMatch ? parseInt(minMatch[1]) : 0,
      maximumWatts: maxMatch ? parseInt(maxMatch[1]) : 0,
      averageWatts: avgMatch ? parseInt(avgMatch[1]) : 0,
    };
  }

  public async getChassisStatus(): Promise<ChassisStatus> {
    const result = await this.exec(['chassis', 'status']);

    const output = result.stdout;

    return {
      powerOn: output.includes('System Power         : on'),
      powerOverload: output.includes('Power Overload       : true'),
      powerInterlock: output.includes('Power Interlock      : active'),
      powerFault: output.includes('Main Power Fault     : true'),
      powerControlFault: output.includes('Power Control Fault  : true'),
      lastPowerEvent: this.extractValue(output, 'Last Power Event'),
      chassisIntrusion: this.extractValue(output, 'Chassis Intrusion'),
    };
  }

  public async getAllSensors() {
    const result = await this.exec(['sensor', 'list']);

    const sensors: SensorReading[] = [];

    for (const line of result.stdout.split('\n')) {
      if (line.trim().length === 0) continue;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        sensors.push({
          sensor: parts[0],
          value: parts[1] || 'N/A',
          units: parts[2] || '',
          status: parts[3] || 'ok',
        });
      }
    }

    return sensors;
  }

  public async getSystemEventLog(lines: number = 20) {
    const result = await this.exec(['sel', 'list', 'last', lines.toString()]);
    return result.stdout;
  }

  public async clearSystemEventLog() {
    this.logger.log('Clearing system event log');
    await this.exec(['sel', 'clear']);
  }

  private extractValue(text: string, key: string): string {
    const regex = new RegExp(`${key}\\s*:\\s*(.+)`);
    const match = text.match(regex);
    return match ? match[1].trim() : 'unknown';
  }
}
