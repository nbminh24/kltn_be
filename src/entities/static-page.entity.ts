import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('static_pages')
export class StaticPage {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @UpdateDateColumn()
  last_modified: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modified_by: string;

  @Column({ type: 'varchar', length: 20, default: 'Published' })
  status: string;
}
