import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MachineService } from './machine.service';
import { MachineApplyService } from './machine.apply.service';
import { Machine } from './machine.entity';

@Injectable()
export class MachineSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MachineSchedulerService.name);

  constructor(
    private readonly machineService: MachineService,
    private readonly machineApplyService: MachineApplyService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    const machines = await this.machineService.getEnabledMachines();

    for (const machine of machines) {
      this.createJobForMachine(machine);
    }

    this.logger.log(`Created ${machines.length} scheduled jobs`);
  }

  private createJobForMachine(machine: Machine) {
    const jobName = `machine-${machine.id}`;

    // Remove existing job if it exists
    try {
      const existingJob = this.schedulerRegistry.getCronJob(jobName);
      if (existingJob) {
        existingJob.stop();
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    } catch (error) {
      // Job doesn't exist, which is fine
    }

    const job = new CronJob(machine.cron, async () => {
      this.logger.log(`Running job for machine: ${machine.name}`);
      try {
        await this.machineApplyService.execute(machine.id);
        this.logger.log(`Job completed for machine: ${machine.name}`);
      } catch (error) {
        this.logger.error(
          `Job failed for machine: ${machine.name}`,
          error.stack,
        );
      }
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Scheduled job for machine: ${machine.name} with cron: ${machine.cron}`,
    );
  }

  public addOrUpdateMachineJob(machine: Machine) {
    if (machine.enabled) {
      this.createJobForMachine(machine);
    } else {
      this.removeMachineJob(machine.id);
    }
  }

  public removeMachineJob(machineId: string) {
    const jobName = `machine-${machineId}`;
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      if (job) {
        job.stop();
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Removed job for machine: ${machineId}`);
      }
    } catch (error) {
      this.logger.warn(`Job not found for machine: ${machineId}`);
    }
  }
}
