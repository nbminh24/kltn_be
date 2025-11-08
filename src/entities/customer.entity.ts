import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'text', nullable: true, select: false })
  password_hash: string;

  @Column({ type: 'varchar', default: 'inactive' })
  status: string; // 'inactive' | 'active'

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  refresh_token_expires: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
