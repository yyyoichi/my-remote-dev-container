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

- HostName: 1の`InstancePublicDns`値。
- User: `ubuntu`
- IdentityFile:
  - 1の`GetWireGuardSSHKeyCommand`コマンドを実行した結果を適当に`~/.ssh/wireguard.pem`などで保存
  - `~/.ssh/wireguard.pem`を指定。

#### 2-2. WireGuardのconfファイル取得

WireGuardインスタンスに接続して以下を実行

- `curl -O https://raw.githubusercontent.com/angristan/wireguard-install/master/wireguard-install.sh`
- `chmod +x wireguard-install.sh`
- `sudo ./wireguard-install.sh`
  - `IPv4 or IPv6 public addresss`に`WireGuardEIP`
  - `Server WireGuard port [1-65535]`に`WireGuardInstanceUDPPort`
  - `Allowed IPs list for generated clients`に`AllowedIps`の値
  - `The client name`は適当
  - ほかはそのままEnter。
- 上で出力された`Your client config file is in`に続くファイルの中身をローカルマシンに`wireguard.conf`などとして保存
- `sudo wg-quick down wg0`で停止
- `/etc/wireguard/wg0.conf`の一部に下記に指定。`WireGuardInstanceUDPPort`のポートが55200として。
- `sudo wg-quick up wg0`で起動

PostUpの2,3行目を追加、PostDownの2,3行目を追加

```conf
[Interface]
...
PostUp = iptables -I INPUT -p udp --dport 55200 -j ACCEPT
PostUp = iptables -A INPUT -i wg0 -p tcp --dport 22 -j ACCEPT
PostUp = iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
PostUp = iptables -I FORWARD -i ens5 -o wg0 -j ACCEPT
PostUp = iptables -I FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
PostUp = ip6tables -I FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport 55200 -j ACCEPT
PostDown = iptables -D INPUT -i wg0 -p tcp --dport 22 -j ACCEPT
PostDown = iptables -D INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
PostDown = iptables -D FORWARD -i ens5 -o wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o ens5 -j MASQUERADE
PostDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o ens5 -j MASQUERADE
...
[Perr]
...
```

#### 2-3. WireGuardでVPNに入る

ローカルマシンでの操作。

- ローカルアプリ`WireGuard`を開く
- `ファイルからトンネルをインポート`で2-2で作成した`wireguard.conf`を選択する
- `有効化`で接続

#### 2-補足. WireGuardインスタンスのSSHを閉じる

- 1の`GetBlockSSHCommand`を実行
- 開く場合は、`GetAllowSSHCommand`を実行

### 3. 開発インスタンスを作成

- 1の`VpcId`を`.env`ファイルのVPC_IDに指定。
- `npx cdk deploy DevInstanceCdkStack`

### 4. 開発インスタンスに接続

- 2でWireGuardが有効になっている。
- SSH設定を以下から取得して接続
  - HostName: 3の`DevInstancePrivateIp`値。
  - User: `ubuntu`
  - IdentityFile:
    - 1で`GetDevInstanceSSHKeyCommand`に出力されたコマンドを実行した結果を適当に`~/.ssh/dev-instance.pem`などで保存
    - `~/.ssh/dev-instance.pem`を指定。
- 接続完了🎆
