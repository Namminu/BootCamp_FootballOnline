# BootCamp_FootballOnline
내일배움캠프 - 3주차 풋살 온라인 프로젝트


# API 명세서
https://www.notion.so/teamsparta/13f2dc3ef51481d0aafee3add8e524b6?v=13f2dc3ef5148192aaf0000c62bb882d

# 선수 강화 API

선수 강화는 동일한 선수와 동일한 강화 단계일 때만 가능합니다.

### 강화 비용
강화 비용은 다음과 같은 공식에 따라 계산됩니다:

강화 비용 = 1000 * Math.pow(2, targetPlayer.enhanced)

markdown
코드 복사

- `targetPlayer.enhanced`는 현재 선수의 강화 단계입니다.
- `Math.pow(2, targetPlayer.enhanced)`는 2의 `targetPlayer.enhanced` 제곱을 계산합니다.

#### 예시
- **강화 단계 0**에서 강화할 경우:
  - 강화 비용 = 1000 * Math.pow(2, 0) = 1000 * 1 = **1000**
- **강화 단계 1**에서 강화할 경우:
  - 강화 비용 = 1000 * Math.pow(2, 1) = 1000 * 2 = **2000**
- **강화 단계 2**에서 강화할 경우:
  - 강화 비용 = 1000 * Math.pow(2, 2) = 1000 * 4 = **4000**

### 강화 확률
강화 확률은 강화 단계에 따라 달라지며, 아래와 같은 공식으로 계산됩니다:

강화 확률 = 100 - 10 * targetPlayer.enhanced

markdown
코드 복사

- `targetPlayer.enhanced`는 현재 선수의 강화 단계입니다.
- 강화 단계가 올라갈수록 강화 확률이 감소합니다.

#### 예시
- **강화 단계 0**에서 강화할 경우:
  - 강화 확률 = 100 - 10 * 0 = **100%**
- **강화 단계 1**에서 강화할 경우:
  - 강화 확률 = 100 - 10 * 1 = **90%**
- **강화 단계 2**에서 강화할 경우:
  - 강화 확률 = 100 - 10 * 2 = **80%**

### 요약
- 강화 비용은 강화 단계가 올라갈수록 기하급수적으로 증가합니다.
- 강화 확률은 강화 단계가 올라갈수록 감소합니다.











# 게임 시스템 및 MMR 변화 (Game System & MMR Changes)

이 문서는 게임의 **기본 로직**과 **MMR 변화** 시스템, **게임 결과**에 대한 설명을 제공합니다. 게임의 승패와 그에 따른 **MMR 변화**는 게임의 중요한 부분이며, 이는 **기준 팀(내 팀)**을 기준으로 상대 팀과의 **등수 차이**에 따라 결정됩니다.

---

##  게임 로직 (Game Logic)

### 1. 게임 진행 과정 (Game Flow)

게임은 다음과 같은 흐름으로 진행됩니다:

1. **게임 시작**:
   - 게임이 시작되면, **내 등수**에서 **+-2 등수** 범위 내에 있는 상대 팀들과 매칭됩니다. 예를 들어, 내 등수가 5라면, 내 팀은 3등부터 7등까지의 팀과 매칭될 수 있습니다.
   
   - 각 팀은 3명의 선수가 있으며, 각 선수는 5가지 능력치를 가지고 있습니다:
     - `player_speed`
     - `player_finish`
     - `player_power`
     - `player_defense`
     - `player_stamina`
   
   이 능력치들의 평균을 구해 **팀의 평균 능력치**를 계산합니다.

2. **게임 진행**:
   - 게임 시간은 **15분**입니다. 이 15분 동안 각 팀은 골을 넣을 기회를 가지게 됩니다.
   
   - 각 팀의 **평균 능력치**는 골을 넣을 확률에 영향을 미칩니다. 게임이 진행되는 동안, **1분마다** 골을 넣을 수 있는 기회가 주어지며, 해당 시간에 **랜덤 숫자**를 통해 골이 들어갈지 결정됩니다.
     - 랜덤 숫자(1~200)가 생성되고, 이 숫자가 **팀 평균 능력치**보다 낮으면 골이 들어갑니다.
   
3. **게임 종료**:
   - 15분이 끝나면 게임이 종료됩니다. 게임 결과는 **승리**, **패배** 또는 **무승부**로 결정됩니다.
   
   - 게임이 종료되면, **MMR 변화**가 계산되고, 승리한 팀과 패배한 팀의 **MMR**이 업데이트됩니다.

---

### 2. MMR 변화 규칙

게임이 끝난 후, 승리한 팀과 패배한 팀의 **랭크 차이**에 따라 **MMR 변화**가 계산됩니다. 각 팀의 **MMR 변화**는 **기준 팀(내 팀)**을 기준으로 계산됩니다.

- **내 팀 승리 시**: 내 팀은 **MMR을 얻고**, 상대 팀은 **MMR을 잃습니다**.
- **내 팀 패배 시**: 내 팀은 **MMR을 잃고**, 상대 팀은 **MMR을 얻습니다**.
- **무승부**: **MMR 변화가 없습니다**.

---

### 1.3. 랭크 차이에 따른 MMR 변화

내 팀과 상대 팀 간의 **랭크 차이**에 따라 MMR 변화가 달라집니다. 각 랭크 차이에 따른 승리와 패배 시 MMR 변화는 다음과 같습니다.

- **내 팀의 랭크가 상대보다 1 등위가 낮을 경우 (내가 3등, 상대가 2등)**:
  - 승리 시: +15 MMR
  - 패배 시: -10 MMR

- **내 팀의 랭크가 상대보다 2 등위가 낮을 경우 (내가 4등, 상대가 2등)**:
  - 승리 시: +20 MMR
  - 패배 시: -5 MMR

- **내 팀과 상대가 동일한 랭크일 경우**:
  - 승리 시: +10 MMR
  - 패배 시: -5 MMR

- **내 팀의 랭크가 상대보다 1 등위가 높을 경우 (내가 2등, 상대가 3등)**:
  - 승리 시: +10 MMR
  - 패배 시: -15 MMR

- **내 팀의 랭크가 상대보다 2 등위가 높을 경우 (내가 1등, 상대가 3등)**:
  - 승리 시: +5 MMR
  - 패배 시: -20 MMR

---

## 3. 게임 결과 및 MMR 변화

게임이 종료되면, **게임 결과**와 **MMR 변화**가 출력됩니다. 게임의 **결과 메시지**와 **MMR 변화**는 다음과 같은 형태로 제공됩니다.

#### 2.1. 게임 결과 설명

- **"message"**: 게임 결과 메시지입니다. 예를 들어 "게임 결과: 승리", "게임 결과: 패배"와 같은 정보가 표시됩니다.
- **"gameDetails"**: 최종 결과를 보여줍니다. 예시: `tess10test 7 : 6 appleuser`처럼 각 팀의 득점을 나타냅니다.
- **"goals"**: 골이 발생한 시점과 골을 넣은 팀을 나열합니다. 이를 통해 게임 중 발생한 주요 사건을 확인할 수 있습니다.

#### 2.2. MMR 변화 (MMR Changes)

- **"mmrChanges"**: 게임 후, 내 팀과 상대 팀의 **MMR 변화**를 보여줍니다.
  - **"currentAccountMMRChange"**: 내 팀의 MMR 변화 값. 승리 시 양수, 패배 시 음수입니다.
  - **"opponentAccountMMRChange"**: 상대 팀의 MMR 변화 값. 내 팀의 변화와 반대 방향으로 적용됩니다.
  - **"updatedCurrentMMR"**: 게임 후 내 팀의 새로운 MMR입니다.
  - **"updatedOpponentMMR"**: 게임 후 상대 팀의 새로운 MMR입니다.

---

## 4. 게임 결과 예시

```json
{
  "message": "게임 결과: 승리",
  "gameDetails": "tess10test 7 : 6 appleuser",
  "goals": [
    "tess10test 팀이 1분에 골을 넣었습니다.",
    "tess10test 팀이 3분에 골을 넣었습니다.",
    "appleuser 팀이 5분에 골을 넣었습니다.",
    "tess10test 팀이 6분에 골을 넣었습니다.",
    "tess10test 팀이 7분에 골을 넣었습니다.",
    "appleuser 팀이 7분에 골을 넣었습니다.",
    "tess10test 팀이 8분에 골을 넣었습니다.",
    "appleuser 팀이 8분에 골을 넣었습니다.",
    "tess10test 팀이 9분에 골을 넣었습니다.",
    "tess10test 팀이 11분에 골을 넣었습니다.",
    "appleuser 팀이 11분에 골을 넣었습니다.",
    "appleuser 팀이 13분에 골을 넣었습니다.",
    "appleuser 팀이 14분에 골을 넣었습니다."
  ],
  "mmrChanges": {
    "currentAccountMMRChange": 20,
    "opponentAccountMMRChange": -20,
    "updatedCurrentMMR": 995,
    "updatedOpponentMMR": 985
  }
}
