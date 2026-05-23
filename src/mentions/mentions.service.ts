import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Comment } from '../comments/comment.entity';
import { CommentMention } from '../comments/comment-mention.entity';
import { User } from '../users/user.entity';

export interface MentionedUserView {
  id: number;
  username: string;
  fullName: string;
}

export interface MentionedCommentView {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  mentionedUsers: MentionedUserView[];
}

export interface MentionsPage {
  data: MentionedCommentView[];
  total: number;
  page: number;
}

const MENTION_PATTERN = /@([A-Za-z0-9_]+)/g;

@Injectable()
export class MentionsService {
  constructor(
    @InjectRepository(CommentMention)
    private readonly mentionRepo: Repository<CommentMention>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async syncForComment(commentId: number, content: string): Promise<User[]> {
    await this.mentionRepo.delete({ commentId });
    const names = this.parseUsernames(content);
    if (names.length === 0) {
      return [];
    }
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.username) IN (:...names)', { names })
      .getMany();
    if (users.length === 0) {
      return [];
    }
    await this.mentionRepo.save(
      users.map((user) =>
        this.mentionRepo.create({ commentId, userId: user.id }),
      ),
    );
    return users;
  }

  async findForUser(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<MentionsPage> {
    const links = await this.mentionRepo.find({
      where: { userId },
      select: ['commentId'],
    });
    const commentIds = links.map((link) => link.commentId);
    if (commentIds.length === 0) {
      return { data: [], total: 0, page };
    }
    const [comments, total] = await this.commentRepo.findAndCount({
      where: { id: In(commentIds) },
      relations: ['mentions', 'mentions.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      data: comments.map((comment) => this.toView(comment)),
      total,
      page,
    };
  }

  private parseUsernames(content: string): string[] {
    const set = new Set<string>();
    for (const match of content.matchAll(MENTION_PATTERN)) {
      set.add(match[1].toLowerCase());
    }
    return [...set];
  }

  private toView(comment: Comment): MentionedCommentView {
    return {
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: comment.authorId,
      content: comment.content,
      mentionedUsers: (comment.mentions ?? [])
        .filter((mention) => mention.user)
        .map((mention) => ({
          id: mention.user.id,
          username: mention.user.username,
          fullName: mention.user.fullName,
        })),
    };
  }
}
