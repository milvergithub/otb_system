import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount, DiscountType } from './entities/discount.entity';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';

@Injectable()
export class DiscountService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
  ) {}

  async findAll(): Promise<Discount[]> {
    return this.discountRepository.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Discount[]> {
    return this.discountRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Discount> {
    const discount = await this.discountRepository.findOne({ where: { id } });
    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    return discount;
  }

  async create(dto: CreateDiscountDto): Promise<Discount> {
    const existing = await this.discountRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Discount name already exists');
    }

    const discount = this.discountRepository.create({
      name: dto.name,
      type: dto.type ?? DiscountType.FIXED,
      value: dto.value.toString(),
      description: dto.description,
      is_active: dto.is_active ?? true,
    });
    return this.discountRepository.save(discount);
  }

  async update(id: string, dto: UpdateDiscountDto): Promise<Discount> {
    const discount = await this.findOne(id);

    if (dto.name && dto.name !== discount.name) {
      const existing = await this.discountRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('Discount name already exists');
      }
      discount.name = dto.name;
    }

    if (dto.type !== undefined) {
      discount.type = dto.type;
    }
    if (dto.value !== undefined) {
      discount.value = dto.value.toString();
    }
    if (dto.description !== undefined) {
      discount.description = dto.description;
    }
    if (dto.is_active !== undefined) {
      discount.is_active = dto.is_active;
    }

    return this.discountRepository.save(discount);
  }

  async remove(id: string): Promise<void> {
    const discount = await this.findOne(id);
    await this.discountRepository.remove(discount);
  }

  calculateDiscountAmount(totalAmount: number, discount: Discount): number {
    const value = parseFloat(discount.value);
    if (discount.type === 'fixed') {
      return Math.min(value, totalAmount);
    }
    return totalAmount * (value / 100);
  }
}
