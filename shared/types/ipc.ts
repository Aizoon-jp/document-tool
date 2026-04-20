export interface IpcApi {
  'app:getVersion': () => Promise<string>
}

export type IpcChannel = keyof IpcApi
