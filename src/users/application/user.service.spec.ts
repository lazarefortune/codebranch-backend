import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return list of user', () => {
    const result = service.findAll();
    expect(result).toBeInstanceOf(Array);
  });

  it('should create a user', () => {
    const user = service.create({
      username: 'lazarefortune',
      email: 'lazarefortune@gmail.com',
    });
    expect(user).toHaveProperty('id');
    expect(user.username).toBe('lazarefortune');
  });
});
