# クラウド開発マシンを手に入れる

- 開発マシンが欲しい。
- VPNからのみ開発マシンにSSHできるようにしたい。

## 構築手順

### 必要なもの

- クライアント接続したいPCにWireGuardアプリ
- AWS CDK typescript

### 1. WireGuardインスタンスを作成

- `npx cdk deploy WireGuardVpnStack`
- 出力された`Outputs:`以下は置いておくと便利

必要に応じて`cdk bootstrap`の実行や`--profile`の指定。

### 2. WireGuard設定

#### 2-1. WireGuardインスタンスに接続

SSH設定を以下から取得して接続

- HostName: 1で`InstancePublicDns`で出力された値。
- User: `ubuntu`
- IdentityFile:
  - 1で`GetWireGuardSSHKeyCommand`に出力されたコマンドを実行した結果を適当に`~/.ssh/wireguard.pem`などで保存
  - `~/.ssh/wireguard.pem`を指定。

#### 2-2. WireGuardのconfファイル取得

WireGuardインスタンスに接続して以下を実行

- `curl -O https://raw.githubusercontent.com/angristan/wireguard-install/master/wireguard-install.sh`
- `chmod +x wireguard-install.sh`
- `sudo ./wireguard-install.sh`
  - `Allowed IPs list for generated clients`に`AllowedIps`の値
  - `The client name`は適当
  - ほかはそのままEnter。
- 上で出力された`Your client config file is in`に続くファイルの中身をローカルマシンに`wireguard.conf`などとして保存

#### 2-3. WireGuardでVPNに入る

ローカルマシンでの操作。

- ローカルアプリ`WireGuard`を開く
- `ファイルからトンネルをインポート`で2-2で作成した`wireguard.conf`を選択する
- `有効化`で接続

#### 2-補足. WireGuardインスタンスのSSHを閉じる

- 1で出力された`GetBlockSSHCommand`を実行
- 開く場合は、`GetAllowSSHCommand`を実行
