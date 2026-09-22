# 컴시개에서 살아남기 — EC2 배포

## 준비된 것과 아직 필요한 것

- 앱 전체 소스, 1~8주차 강의·과제, 220문항·심화 10문항, 원문 이미지·PDF, 로그인·관리자·커뮤니티 코드가 Git 관리 대상이다.
- `deploy/ec2`는 기존 API를 재사용하고 Cloudflare D1을 로컬 SQLite로 대체하는 별도 실행 경로다. 기존 Sites 사이트는 그대로 동작한다.
- EC2용은 Node 24 기본 모듈만 사용한다. `pnpm install`, Next/Vinext 빌드, PM2가 필요 없다. Docker가 프로세스를 재시작한다.
- **Git 코드에는 운영 DB의 실제 진도·답안·게시글이 들어 있지 않다.** 새 EC2는 빈 학습 기록으로 시작한다. 아래 데이터 이전 절차를 확인한다.
- 수강생 이름·학번·비밀번호 해시와 강의 자료가 포함돼 있다. **반드시 비공개 저장소**를 사용한다. `.env`, DB, 세션, 백업, PEM 키는 Git에 올리지 않는다.

## 1. AWS 설정

권장 시작 구성: **서울 리전 / Ubuntu Server 24.04 LTS x86_64 / t3.small (2 vCPU, 2 GiB) / 암호화 gp3 30 GiB / Elastic IP**.

30명의 강의 조회·답안 저장을 목표로 하는 시작 사양이다. 동시 다운로드·관리자 조회·실제 EC2의 CPU 크레딧 상태에 따라 달라진다. 로컬 30명 병렬 테스트와 EC2 성능 보장은 구분한다. PDF를 동시에 많이 내려받는다면 대역폭도 확인한다. 여러 사이트를 함께 운영하거나 여유가 필요하면 t3.medium(4 GiB)을 선택한다.

AWS 보안 그룹 인바운드:

| 포트 | 허용 대상 |
|---|---|
| TCP 22 | 본인 공인 IP/32 |
| TCP 80 | 0.0.0.0/0 |
| TCP 443 | 0.0.0.0/0 |

IPv6를 실제 사용하는 경우에만 HTTP/HTTPS의 ::/0을 추가한다. 앱의 3000번 포트나 DB 포트는 열지 않는다. 도메인 A 레코드는 Elastic IP로 설정한다. AAAA가 다른 곳을 가리키면 삭제하거나 올바르게 수정한다.

기존 Nginx/Apache가 80·443을 쓰는 서버에서는 이 Caddy 구성과 충돌한다. 이 가이드는 새 전용 인스턴스 기준이다.

## 2. 서버 접속 및 Docker 설치

로컬 PC에서:

```bash
ssh -i YOUR_KEY.pem ubuntu@YOUR_ELASTIC_IP
```

Ubuntu 서버에서 Docker 공식 저장소 설치:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF_DOCKER
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF_DOCKER
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
exit
```

다시 SSH 접속한다. Docker 그룹은 관리자 수준 권한이므로 운영 담당자에게만 부여한다.

## 3. 비공개 Git 저장소 복제

아직 저장소 주소가 확정되지 않았다. 아래 `OWNER/REPOSITORY`를 실제 비공개 저장소로 바꾼다.

EC2에서 읽기 전용 GitHub Deploy Key를 만들고, 공개키만 GitHub 저장소 Settings → Deploy keys에 등록한다. 개인키나 토큰을 저장소에 넣지 않는다.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/comsigae_deploy -C comsigae-ec2
cat ~/.ssh/comsigae_deploy.pub
```

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/comsigae_deploy -o IdentitiesOnly=yes' git clone git@github.com:OWNER/REPOSITORY.git ~/comsigae
cd ~/comsigae
git config core.sshCommand 'ssh -i ~/.ssh/comsigae_deploy -o IdentitiesOnly=yes'
```

## 4. 실행

아래 도메인을 실제 도메인으로 바꾼다. 도메인에 `https://`나 경로를 붙이지 않는다.

```bash
cd ~/comsigae/deploy/ec2
printf 'DOMAIN=study.example.com\n' > .env
chmod 600 .env
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app caddy
```

Caddy가 HTTPS 인증서를 발급하고 갱신한다. DNS가 맞고 80·443이 외부에서 열려 있어야 한다. `https://본인도메인`으로 접속해 로그인한다.

초기 계정은 기존 명단과 비밀번호 설정을 사용한다. 비밀번호 원문을 문서나 GitHub에 추가하지 않는다. 기존 Sites의 외부 접근 제한은 EC2에 따라오지 않지만 앱 자체 로그인과 관리자 검증은 적용된다.

## 5. 배포 확인

- 로그인 전 `/course`는 로그인 화면으로 이동하고 `/api/assets?name=question-bank.js`는 401이어야 한다.
- 학생 계정은 `/api/admin`에서 403이어야 한다.
- 답안 입력 → 새로고침 → 답안 복원, 로그아웃 → 재로그인을 확인한다.
- 앞 주차 미완료 또는 연습 답안 누락 시 강의 완료 버튼이 비활성인지 확인한다.
- 관리자 진도 조회, 익명 게시글, 기출 원문, 자료실 PDF를 확인한다.
- `docker compose restart app` 이후에도 답안·게시글이 남는지 확인한다.

```bash
docker compose stats --no-stream
```

실제 수업 시작 전 30명 동시 접속 또는 별도 부하 테스트를 한다. 로그인·저장 오류가 없어야 하고, 5xx·응답 지연·메모리를 확인한다. 아래 로컬 테스트는 테스트용 DB에서 30개 계정을 만들고 삭제하며 운영 DB를 사용하지 않는다.

```bash
# Node 24가 설치된 개발 PC에서 저장소 루트 기준
node deploy/ec2/build.mjs
node deploy/ec2/test.mjs
```

## 6. 백업과 업데이트

```bash
cd ~/comsigae
bash deploy/ec2/backup.sh
```

실행 중인 SQLite는 단순 파일 복사 대신 SQLite 온라인 백업 API로 일관된 파일을 만든다. `backups/`는 Git 제외 대상이다. 생성 파일을 별도 컴퓨터 또는 암호화된 S3 비공개 버킷에 복사한다. 같은 EC2 안의 복사본만으로는 인스턴스 손실에 대비할 수 없다.

하루 한 번 백업하려면 서버에서 `crontab -e` 후 다음을 추가한다.

```cron
0 3 * * * /bin/bash /home/ubuntu/comsigae/deploy/ec2/backup.sh >> /home/ubuntu/comsigae-backup.log 2>&1
```

서버 시간대 기준이며 기본 UTC라면 한국 시간 정오다. 보관 기간을 정해 오래된 백업을 정리하고 실제 복원을 한 번 시험한다.

업데이트:

```bash
cd ~/comsigae
bash deploy/ec2/backup.sh
git pull --ff-only
cd deploy/ec2
docker compose up -d --build
docker compose ps
```

**`docker compose down -v`는 사용하지 않는다.** `-v`는 학습 DB와 인증서 볼륨을 삭제한다. 기존 데이터는 이미지 재빌드나 일반 재시작으로 삭제되지 않는다.

복원은 앱을 정지한 뒤 백업을 볼륨에 복사한다. 현재 DB가 덮어써지므로 복원 직전 백업을 먼저 만든다.

```bash
cd ~/comsigae/deploy/ec2
docker compose stop app
docker compose run --rm --no-deps --user root -v "$HOME/comsigae/backups:/restore:ro" app sh -c 'cp /restore/REPLACE_WITH_BACKUP.sqlite /data/study.sqlite && rm -f /data/study.sqlite-wal /data/study.sqlite-shm && chown node:node /data/study.sqlite'
docker compose up -d app
```

## 7. 기존 사이트 데이터 이전

Git push/clone으로 **학생의 작성 답안·진도·게시글은 이동하지 않는다**. 코드에 있는 `enrollment.json`은 계정 초기 구성이지 운영 DB 백업이 아니다.

기존 기록이 필요하면:

1. 기존 사이트에서 쓰기 작업을 멈추는 이전 시간을 정한다.
2. D1 운영 DB의 일관된 SQL 내보내기 또는 각 테이블의 전체 행을 확보한다. 로컬 `.wrangler` DB를 운영 DB로 착각하면 안 된다.
3. 신규 EC2의 SQLite에 `students`, `study_entries`, `study_activity`, `community_posts`를 가져온다. 값과 타임스탬프를 변경하지 않는다. 세션과 로그인 제한은 이관하지 않아도 되며 다시 로그인한다.
4. 학생 수·답안 수·주차 완료·관리자 통계를 대조한다. `ec2_migrations`는 EC2에서 적용한 상태를 유지한다.
5. 확인 후 새 도메인으로 안내한다.

현재 제공 패키지에 운영 데이터 내보내기는 포함되지 않는다. 이 단계를 완료하기 전 기존 기록이 이전됐다고 간주하지 않는다.

## 8. 비용·용량 판단

t3.small은 2 vCPU / 2 GiB이며 burstable CPU다. 지속 부하에는 CPU 크레딧 및 Unlimited 추가 요금이 영향을 준다. 인스턴스 외에도 EBS, 공인 IPv4, 스냅샷/S3, 초과 전송량, 도메인 비용이 별도다. AWS Calculator에서 **서울 리전·월 730시간·30 GiB gp3·공인 IPv4 1개**를 입력해 예산을 확인한다. 무료 사용을 전제하지 않는다.

현재 구성은 서버 1대라 장애 중 자동 대체 서버는 없다. 30명 규모에서 복잡한 로드밸런서/RDS를 먼저 추가하는 대신 백업·HTTPS·모니터링부터 운영한다. 메모리 부족 또는 DB 지연이 지속되면 t3.medium으로 올리고, 여러 앱 서버가 필요해질 때 공용 DB로 전환한다.

## 참고

- EC2 T3 사양: https://aws.amazon.com/ec2/instance-types/t3/
- 보안 그룹: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Docker Ubuntu 설치: https://docs.docker.com/engine/install/ubuntu/
- Caddy HTTPS: https://caddyserver.com/docs/automatic-https
- Node SQLite: https://nodejs.org/docs/latest-v24.x/api/sqlite.html

검증 범위: Node 실행·로그인·권한 차단·게시글·30명 병렬 조회/저장 테스트. 실제 AWS 인스턴스 생성, Docker 이미지 실행, DNS 및 HTTPS 인증서 발급은 이 작업 환경에서 수행하지 않았다.
