import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Client, type Order } from "@prisma/client";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth.types";
import type { CreateClientDto } from "./dto/create-client.dto";
import type { ListClientsQueryDto } from "./dto/list-clients-query.dto";
import type { UpdateClientDto } from "./dto/update-client.dto";

const LATEST_ORDERS = 5;

const orderSummarySelect = {
  id: true,
  status: true,
  title: true,
  currency: true,
  totalAmount: true,
  prepaymentAmount: true,
  createdAt: true,
  dueDate: true,
} satisfies Prisma.OrderSelect;

type ClientWithLatestOrders = Client & {
  orders: Pick<
    Order,
    | "id"
    | "status"
    | "title"
    | "currency"
    | "totalAmount"
    | "prepaymentAmount"
    | "createdAt"
    | "dueDate"
  >[];
};

function toAmount(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }
  return value.toNumber();
}

function mapOrders(orders: ClientWithLatestOrders["orders"]): {
  id: string;
  status: Order["status"];
  title: string | null;
  currency: string;
  totalAmount: number | null;
  prepayment: number | null;
  createdAt: Date;
  dueDate: Date | null;
}[] {
  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    title: o.title,
    currency: o.currency,
    totalAmount: toAmount(o.totalAmount),
    prepayment: toAmount(o.prepaymentAmount),
    createdAt: o.createdAt,
    dueDate: o.dueDate,
  }));
}

function mapClient(row: ClientWithLatestOrders) {
  return {
    id: row.id,
    fullName: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    latestOrders: mapOrders(row.orders),
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private latestOrdersInclude(): Prisma.OrderFindManyArgs {
    return {
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: LATEST_ORDERS,
      select: orderSummarySelect,
    };
  }

  private buildWhere(query: ListClientsQueryDto): Prisma.ClientWhereInput {
    const parts: Prisma.ClientWhereInput[] = [{ deletedAt: null }];

    const q = query.search?.trim();
    if (q) {
      parts.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (query.orderStatus !== undefined) {
      parts.push({
        orders: {
          some: {
            deletedAt: null,
            status: query.orderStatus,
          },
        },
      });
    }

    if (query.hasOrders === true) {
      parts.push({
        orders: { some: { deletedAt: null } },
      });
    }
    if (query.hasOrders === false) {
      parts.push({
        orders: { none: { deletedAt: null } },
      });
    }

    return { AND: parts };
  }

  private orderBy(
    query: ListClientsQueryDto,
  ): Prisma.ClientOrderByWithRelationInput {
    const dir = query.sortOrder ?? "desc";
    const key = query.sortBy ?? "createdAt";
    if (key === "fullName") {
      return { name: dir };
    }
    return { createdAt: dir };
  }

  async create(dto: CreateClientDto, user: AuthUser) {
    const row = await this.prisma.client.create({
      data: {
        name: dto.fullName.trim(),
        phone: dto.phone?.trim() ? dto.phone.trim() : null,
        address: dto.address?.trim() ? dto.address.trim() : null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        createdById: user.id,
      },
      include: { orders: this.latestOrdersInclude() },
    });
    return mapClient(row);
  }

  async findAll(query: ListClientsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy: this.orderBy(query),
        skip: (page - 1) * limit,
        take: limit,
        include: { orders: this.latestOrdersInclude() },
      }),
    ]);
    return {
      data: rows.map((r) => mapClient(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const lang = getRequestLocale();
    const row = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: { orders: this.latestOrdersInclude() },
    });
    if (!row) {
      throw new NotFoundException(t(lang, "client.notFound"));
    }
    return mapClient(row);
  }

  async update(id: string, dto: UpdateClientDto) {
    const lang = getRequestLocale();
    const existing = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(t(lang, "client.notFound"));
    }
    const data: Prisma.ClientUpdateInput = {};
    if (dto.fullName !== undefined) {
      data.name = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() ? dto.phone.trim() : null;
    }
    if (dto.address !== undefined) {
      data.address = dto.address.trim() ? dto.address.trim() : null;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes.trim() ? dto.notes.trim() : null;
    }
    const row = await this.prisma.client.update({
      where: { id },
      data,
      include: { orders: this.latestOrdersInclude() },
    });
    return mapClient(row);
  }

  async remove(id: string): Promise<void> {
    const lang = getRequestLocale();
    const existing = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(t(lang, "client.notFound"));
    }
    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
