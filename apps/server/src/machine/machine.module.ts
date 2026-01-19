import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MachineService } from './machine.service';
import { MachineRepository } from './machine.repository';
import { MachineApplyService } from './machine.apply.service';
import { MachineSchedulerService } from './machine.scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    MachineRepository,
    MachineService,
    MachineApplyService,
    MachineSchedulerService,
  ],
  controllers: [],
  exports: [MachineService, MachineApplyService, MachineSchedulerService],
})
export class MachineModule {}
