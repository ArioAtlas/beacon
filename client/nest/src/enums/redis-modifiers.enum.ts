export enum RedisModifiers {
  /** NX (Not Exist) Only set the key if it does not already exist. */
  NotExists = 'NX',
  /** XX (eXists) Only set the key if it already exists. */
  Exists = 'XX',
  /**  EX (Expire) Set the expiration time for the key in seconds.*/
  Expire = 'EX',
  /** PX (PExpire) Set the expiration time for the key in milliseconds.*/
  PExpire = 'PX',
  /** EXAT (Expire At) Set the expiration time to a specific Unix timestamp in seconds.*/
  ExpireAt = 'EXAT',
  /** PXAT (PExpire At) Set the expiration time to a specific Unix timestamp in milliseconds.*/
  PExpireAt = 'PXAT',
  /** KEEPTTL (Keep Time To Live) Retain the current TTL (Time To Live) of the key when setting a new value.*/
  KeepTimeToLive = 'KEEPTTL',
  /** GET (Get Value) Retrieve the current value of the key after setting it.*/
  GetValue = 'GET',
}
