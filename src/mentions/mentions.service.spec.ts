import { MentionsService } from './mentions.service';

interface UserShape {
  id: number;
  username: string;
  fullName: string;
}

function build(opts?: {
  matchedUsers?: UserShape[];
  existingMentions?: { commentId: number }[];
}) {
  const queryBuilder = {
    where: jest.fn(),
    getMany: jest.fn().mockResolvedValue(opts?.matchedUsers ?? []),
  };
  queryBuilder.where.mockReturnValue(queryBuilder);

  const userRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  };

  const mentionRepo = {
    delete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockImplementation((row) => row),
    save: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue(opts?.existingMentions ?? []),
  };

  const commentRepo = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  return {
    svc: new MentionsService(
      mentionRepo as never,
      commentRepo as never,
      userRepo as never,
    ),
    mentionRepo,
    userRepo,
    commentRepo,
    queryBuilder,
  };
}

describe('MentionsService', () => {
  describe('syncForComment', () => {
    it('parses @username case-insensitively and dedupes (§3.6 case-insensitive constraint)', async () => {
      const { svc, queryBuilder } = build({
        matchedUsers: [{ id: 5, username: 'alice', fullName: 'Alice' }],
      });

      await svc.syncForComment(1, 'hi @ALICE and @Alice and @alice');

      expect(queryBuilder.where).toHaveBeenCalledTimes(1);
      const [sql, params] = queryBuilder.where.mock.calls[0] as [
        string,
        { names: string[] },
      ];
      expect(sql).toMatch(/LOWER\(u\.username\) IN/);
      expect(params.names).toEqual(['alice']);
    });

    it('deletes prior mentions before inserting new ones (re-evaluation on update)', async () => {
      const { svc, mentionRepo } = build({
        matchedUsers: [{ id: 5, username: 'alice', fullName: 'Alice' }],
      });

      await svc.syncForComment(42, 'hi @alice');

      expect(mentionRepo.delete).toHaveBeenCalledWith({ commentId: 42 });
      expect(mentionRepo.save).toHaveBeenCalledTimes(1);
      const deleteOrder = mentionRepo.delete.mock.invocationCallOrder[0];
      const saveOrder = mentionRepo.save.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(saveOrder);
    });

    it('still deletes prior mentions but does NOT save when content has no @mentions', async () => {
      const { svc, mentionRepo, userRepo } = build();

      const result = await svc.syncForComment(
        7,
        'hello world, no mentions here',
      );

      expect(mentionRepo.delete).toHaveBeenCalledWith({ commentId: 7 });
      expect(mentionRepo.save).not.toHaveBeenCalled();
      expect(userRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findForUser', () => {
    it('queries mentioned comments newest first with pagination (skip/take)', async () => {
      const { svc, commentRepo } = build({
        existingMentions: [{ commentId: 10 }, { commentId: 20 }],
      });

      await svc.findForUser(99, 2, 15);

      expect(commentRepo.findAndCount).toHaveBeenCalledTimes(1);
      const args = commentRepo.findAndCount.mock.calls[0][0] as {
        order: Record<string, string>;
        skip: number;
        take: number;
      };
      expect(args.order).toEqual({ createdAt: 'DESC' });
      expect(args.skip).toBe(15); // (page 2 - 1) * pageSize 15
      expect(args.take).toBe(15);
    });
  });
});
