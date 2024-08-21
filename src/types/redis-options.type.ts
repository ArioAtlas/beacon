export type RedisOptions = {
  /** The Redis server host. */
  host: string;
  /** The Redis server port. */
  port: number;
  /** If set, client will send AUTH command with the value of this option as the first argument when connected. */
  username?: string;
  /** If set, client will send AUTH command with the value of this option when connected. */
  password?: string;
  /** Database index to use. (default: 0) */
  db?: number;
};
