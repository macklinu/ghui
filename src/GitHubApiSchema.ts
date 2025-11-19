import * as Schema from 'effect/Schema'

export class User extends Schema.Class<User>('User')({
  id: Schema.Number,
  login: Schema.String,
}) {}

export class Issue extends Schema.Class<Issue>('Issue')({
  user: User,
  created_at: Schema.DateTimeUtc,
  id: Schema.Number,
  number: Schema.Number,
  title: Schema.String,
  body: Schema.OptionFromNullOr(Schema.String),
  pull_request: Schema.OptionFromNullOr(Schema.Unknown),
}) {}

export class PullRequest extends Schema.Class<PullRequest>('PullRequest')({
  user: User,
  created_at: Schema.DateTimeUtc,
  head: Schema.Struct({
    repo: Schema.Struct({
      name: Schema.String,
      owner: Schema.Struct({
        login: Schema.String,
      }),
    }),
  }),
  base: Schema.Struct({
    repo: Schema.Struct({
      name: Schema.String,
      owner: Schema.Struct({
        login: Schema.String,
      }),
    }),
  }),
  id: Schema.Number,
  draft: Schema.Boolean,
  number: Schema.Number,
  state: Schema.String,
  title: Schema.String,
}) {}
