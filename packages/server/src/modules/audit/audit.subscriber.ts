import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  EntityMetadata,
} from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { ContextService } from '../context/context.service';

const ENTITY_EXCEPTIONS = new Set<string>(['audit_logs']);

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function serializeEntity(
  entity: any,
  metadata: EntityMetadata,
): Record<string, unknown> {
  if (!entity) return {};
  const result: Record<string, unknown> = {};
  for (const column of metadata.columns) {
    if (column.propertyName in entity) {
      const value = (entity as Record<string, unknown>)[column.propertyName];
      if (value !== undefined) {
        result[column.propertyName] = sanitizeValue(value);
      }
    }
  }
  return result;
}

function extractEntityId(entity: any, entityId?: any): string | undefined {
  if (entityId != null) {
    if (typeof entityId === 'string') return entityId;
    if (typeof entityId === 'object' && entityId.id != null) {
      return String(entityId.id);
    }
    if (typeof entityId === 'object' && entityId.uuid != null) {
      return String(entityId.uuid);
    }
  }
  if (entity?.id != null) return String(entity.id);
  return undefined;
}

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<any> {
  listenTo(): any {
    return;
  }

  private isAuditedEntity(metadata: EntityMetadata): boolean {
    const tableName = metadata.tableName;
    if (ENTITY_EXCEPTIONS.has(tableName)) return false;
    return true;
  }

  private async writeLog(
    connection: DataSource,
    action: AuditAction,
    metadata: EntityMetadata,
    entityId: string | undefined,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null,
  ): Promise<void> {
    if (!this.isAuditedEntity(metadata)) return;

    const ctx = ContextService.currentContext;

    const auditLogRepo = connection.getRepository(AuditLog);
    await auditLogRepo.insert({
      user_id: ctx?.userId ?? null,
      action,
      entity: metadata.tableName,
      entity_id: entityId ?? '',
      old_values: oldValues ?? null,
      new_values: newValues ?? null,
      ip_address: ctx?.ipAddress ?? null,
      user_agent: ctx?.userAgent ?? null,
    } as any);
  }

  async afterInsert(event: InsertEvent<any>): Promise<void> {
    const entityId = extractEntityId(event.entity, event.entityId);
    const newValues = serializeEntity(event.entity, event.metadata);
    await this.writeLog(
      event.connection,
      AuditAction.CREATE,
      event.metadata,
      entityId,
      null,
      newValues,
    );
  }

  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
    const entityId =
      extractEntityId(event.databaseEntity) ?? extractEntityId(event.entity);
    const oldValues =
      event.databaseEntity !== undefined
        ? serializeEntity(event.databaseEntity, event.metadata)
        : null;
    const newValues = serializeEntity(event.entity, event.metadata);
    await this.writeLog(
      event.connection,
      AuditAction.UPDATE,
      event.metadata,
      entityId,
      oldValues,
      newValues,
    );
  }

  async afterRemove(event: RemoveEvent<any>): Promise<void> {
    const entityId =
      extractEntityId(event.databaseEntity, event.entityId) ??
      extractEntityId(event.entity);
    const oldValues =
      event.databaseEntity !== undefined
        ? serializeEntity(event.databaseEntity, event.metadata)
        : null;
    await this.writeLog(
      event.connection,
      AuditAction.DELETE,
      event.metadata,
      entityId,
      oldValues,
      null,
    );
  }
}
