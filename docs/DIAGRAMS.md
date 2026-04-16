# KON-NECT — System Diagrams

A complete visual breakdown of how every part of KON-NECT works. Written in plain language so anyone can follow along.

---

## 1. The Big Picture

How every part of KON-NECT connects — your device, the brain behind the scenes, and external services.

```mermaid
graph TD
    You((You))

    subgraph "Your Device"
        App[Screen & Interface]
        Map[Live Social Map]
        Chat[Chat Window]
        Nav[Navigation Guide]
        LiveConn[Live Connection]
    end

    subgraph "The Brain"
        Gateway[Request Handler]
        LoginHandler[Secure Login]
        MatchEngine[Interest Match Engine]
        StatsEngine[Live Stats Engine]
        ChatEngine[Encrypted Chat Engine]
    end

    subgraph "Storage & Outside Services"
        Database[(User & Chat Database)]
        PlaceSearch((Place Name Lookup))
        RouteCalc((Road Route Calculator))
    end

    You <--> App
    App --> Map
    App --> Chat
    App --> Nav
    LiveConn <--> ChatEngine
    Map <--> RouteCalc
    Map <--> PlaceSearch
    Gateway <--> LoginHandler
    Gateway <--> MatchEngine
    Gateway <--> StatsEngine
    MatchEngine <--> Database
    ChatEngine <--> Database
    LoginHandler <--> Database
```

---

## 2. How Data Is Organized

The structure of every piece of information stored in KON-NECT.

```mermaid
erDiagram
    USER ||--o{ FRIEND-REQUEST : "Sends or Receives"
    USER ||--o{ CONVERSATION : "Has Chats With"
    USER ||--o{ BLOCKED-USER : "Has Blocked"
    FRIENDSHIP }o--|| USER : "Connected to Person A"
    FRIENDSHIP }o--|| USER : "Connected to Person B"
    CONVERSATION ||--o{ MESSAGE : "Stores"

    USER {
        String Name "Display Name"
        String Email "Login Email"
        String Photo "Profile Photo URL"
        String Bio "Short Description"
        String[] Interests "Hobbies and Tags"
        Point Location "GPS Position"
        String LoginMethod "Email or Google"
        Boolean IsActive "Currently Online"
    }

    FRIEND-REQUEST {
        String From "Who Sent It"
        String To "Who Received It"
        String Status "Pending or Cancelled"
        Date SentAt "When It Was Sent"
    }

    CONVERSATION {
        String RoomID "Unique Chat Room"
        String[] Participants "Both User IDs"
        Date LastMessage "Most Recent Activity"
    }

    MESSAGE {
        String Sender "Who Wrote It"
        String Receiver "Who Got It"
        String Content "Encrypted Text"
        String Status "Sent / Delivered / Read"
        Date ReadAt "When It Was Read"
    }

    BLOCKED-USER {
        String BlockedBy "Who Blocked"
        String Target "Who Was Blocked"
    }
```

---

## 3. Signing In

How you securely log in, whether using email or Google.

```mermaid
sequenceDiagram
    participant You
    participant App
    participant LoginGateway as Login Gateway
    participant GoogleService as Google
    participant Database

    You->>App: Open login screen
    App->>LoginGateway: Request entry

    alt Alternative: Email Login
        LoginGateway->>Database: Check if email exists
        Database-->>LoginGateway: Found — verify password
        LoginGateway->>LoginGateway: Password matches
    else Alternative: Google Sign-In
        LoginGateway->>GoogleService: Verify Google identity
        GoogleService-->>LoginGateway: Confirmed — share profile info
        LoginGateway->>Database: Find or create account
    end

    LoginGateway->>LoginGateway: Create JWT Token (7 days)
    LoginGateway-->>App: Send token and profile
    App->>App: Save session locally
    Note over App, LoginGateway: Every future request carries this token automatically
```

---

## 4. Compatibility Matching

How the app decides which people near you are a good match.

```mermaid
graph TD
    YouProfile[Your Profile] --> Compare[Compare Interests and Distance]
    TheirProfile[Nearby Person's Profile] --> Compare

    Compare --> Distance{Within 20km?}

    Distance -- "No" --> NoMatch([Not Shown on Map])
    Distance -- "Yes" --> Interests{Any Shared Interests?}

    Interests -- "No" --> NoMatch
    Interests -- "Yes" --> Score[Count Shared Interests]

    Score --> Rank[Rank by Match Score]
    Rank --> Pin([Show on Map with Score Badge])
```

---

## 5. People Discovery Flow

How the Connect tab and map find and sort people for you.

```mermaid
graph LR
    Location([Your Live Location]) --> Engine[Discovery Engine]

    subgraph "Two Modes"
        Nearby[Nearby Mode: 20km + Shared Interests]
        Discover[Discover Mode: 50 Nearest People]
        Global[Global Mode: Everyone on Platform]
    end

    Engine --> Nearby
    Engine --> Discover
    Engine --> Global

    Nearby --> Filter[Remove Blocked Users]
    Discover --> Filter
    Global --> Filter

    Filter --> Sort[Sort by Match Score]
    Sort --> Display([Shown on Map and Connect Tab])
```

---

## 6. Connecting with Someone

The full lifecycle of a friend connection — from request to friendship to removal.

```mermaid
stateDiagram-v2
    [*] --> RequestSent : You send a request

    state RequestSent {
        direction LR
        Pending --> AutoAccepted : Both users sent to each other
        Pending --> Accepted : They tap Accept
        Pending --> Declined : They tap Decline
        Pending --> Cancelled : You withdraw the request
    }

    Accepted --> Friends : Mutual connection created
    AutoAccepted --> Friends : Instant mutual connection
    Declined --> [*] : No connection made

    state Friends {
        direction TB
        CanChat : Private Chat Unlocked
        CanSeeStatus : Online Status Visible
    }

    Friends --> Unfriended : Either side removes the other
    Friends --> Blocked : Either side blocks the other

    Unfriended --> [*]
    Blocked --> [*]
```

---

## 7. Encrypted Chat Flow

How your messages travel securely and are stored with read receipts.

```mermaid
sequenceDiagram
    participant You
    participant Server as Central Hub
    participant Friend

    You->>Server: Open chat room
    Server-->>You: Load previous messages (decrypted for display)

    rect rgba(0, 100, 200, 0.08)
    Note over You, Friend: Sending a Message
    You->>You: Type message
    You->>Server: Send encrypted message
    Server->>Server: Save to database (stays encrypted)
    Server-->>Friend: Deliver message instantly
    Friend-->>Server: Mark as Read
    Server-->>You: Read confirmation (blue tick)
    end
```

---

## 8. Live Location & Map Updates

How your position is tracked and the map stays accurate without draining your battery.

```mermaid
graph TD
    Start([App Opens]) --> Watch[Begin Watching Position]

    Watch --> FirstFix{First GPS Fix?}
    FirstFix -- "Yes, and no saved location" --> Center[Center Map on You]
    FirstFix -- "Saved location exists" --> UseSaved[Use Saved Position]

    Center --> Emit[Send Location to Server]
    UseSaved --> Emit

    Emit --> DB[Save to Database]
    DB --> Refresh[Refresh Nearby Users on Map]

    Watch --> Move{Position Changed?}
    Move -- "Yes" --> Emit

    Move -- "No change" --> Watch
```

---

## 9. Navigation & Route Tailing

How turn-by-turn directions work and how the route shrinks as you move.

```mermaid
graph TD
    Start([You tap Directions]) --> Calc[Calculate Road Route]
    Calc --> Draw[Draw Full Route on Map]

    subgraph "While Navigating"
        Watch[Track Your Movement]
        Find[Find Closest Point on Route]
        Trim[Remove Completed Segment]
        Redraw[Redraw Remaining Route]
    end

    Draw --> Watch
    Watch --> Find
    Find --> Trim
    Trim --> Redraw
    Redraw --> Watch

    Redraw --> Arrived([Route Complete — End Trip])
```

---

## 10. Interest Normalization

How custom interest tags are cleaned up and kept consistent across all users.

```mermaid
graph LR
    Input([User types a new interest]) --> Trim[Remove extra spaces]
    Trim --> Capitalize[Capitalize each word]
    Capitalize --> Check{Match a standard interest?}

    Check -- "Yes" --> UseStandard[Use the standard version exactly]
    Check -- "No" --> Moderate{Pass moderation check?}

    Moderate -- "No" --> Blocked([Rejected — warning issued])
    Moderate -- "Yes" --> Dedupe{Already saved by user?}

    Dedupe -- "Yes" --> Skip([Skip — no duplicate saved])
    Dedupe -- "No" --> Save([Add to profile])

    UseStandard --> Save
```

---

## 11. Blocking & Safety

How blocking works instantly across the entire platform.

```mermaid
sequenceDiagram
    participant You
    participant Server as Central Hub
    participant TheirDevice as Blocked Person's Device

    You->>Server: Block this user
    Server->>Server: Remove friendship (both sides)
    Server->>Server: Delete pending requests (both directions)
    Server->>Server: Add to your blocked list
    Server-->>TheirDevice: Remove you from their map and lists instantly
    Server-->>You: Remove them from your map and lists instantly
    Note over You, TheirDevice: Neither person can see or contact the other any more
```

---

## 12. Content Moderation

How inappropriate interest tags are caught automatically.

```mermaid
graph TD
    Submit([User submits interests]) --> Validate[Run moderation check]

    Validate --> Clean{All interests clean?}

    Clean -- "Yes" --> Save[Save interests to profile]

    Clean -- "No" --> Strike[Add a strike to account]
    Strike --> Count{Total strikes?}

    Count -- "Under 6" --> Warn[Return warning + remaining chances]
    Warn --> SaveClean[Save only the safe interests]

    Count -- "6 or more" --> Terminate[Delete account entirely]
    Terminate --> Notify[Notify all online users to remove them]
    Notify --> Done([Account gone])
```

---

## 13. Live Online Status

How KON-NECT knows who is online and keeps status badges accurate.

```mermaid
sequenceDiagram
    participant Me as You
    participant Server as Central Hub
    participant Friends

    Me->>Server: App opens — connect
    Server->>Server: Mark you as Active
    Server-->>Friends: Broadcast: You are Online

    Note over Me, Friends: While you're active, all friends see your green dot

    Me->>Server: Close app / log out
    Server->>Server: Wait 1 second (in case of page refresh)
    Server->>Server: Confirm no other session open
    Server->>Server: Mark you as Offline
    Server-->>Friends: Broadcast: You are Offline
```

---

## 14. Dashboard Stats

How the live numbers on your home screen are calculated.

```mermaid
graph LR
    Load([Home Screen Opens]) --> Coords[Read Your GPS Coordinates]

    Coords --> FriendsNearby[Count friends active within 20km in last 24h]
    Coords --> MatchedInterests[Count your distinct interests shared by users within 20km]
    Coords --> Trending[Find top 5 most popular interests within 20km]

    FriendsNearby --> Display([Show on Dashboard])
    MatchedInterests --> Display
    Trending --> Display
```
