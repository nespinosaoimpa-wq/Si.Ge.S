import Dexie, { Table } from 'dexie';

export interface GPSPoint {
  id?: number;
  shift_id: string;
  operator_id: string;
  objective_id?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  status: 'pending' | 'synced';
  error_count?: number;
}

export class SevenZeroFourDB extends Dexie {
  gps_points!: Table<GPSPoint>;

  constructor() {
    super('SevenZeroFourDB');
    this.version(2).stores({
      gps_points: '++id, shift_id, objective_id, timestamp, status'
    });
  }
}

export const db = new SevenZeroFourDB();
