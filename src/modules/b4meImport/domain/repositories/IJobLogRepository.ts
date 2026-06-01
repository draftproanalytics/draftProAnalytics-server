export interface JobLogRecord {
  readonly id: number;
  readonly jobId: number;
  readonly level: string;
  readonly message: string;
  readonly createdAt: Date;
}

export interface IJobLogRepository {
  create(jobId: number, level: 'INFO' | 'WARN' | 'ERROR', message: string): Promise<void>;
  findByJobId(jobId: number): Promise<readonly JobLogRecord[]>;
}
