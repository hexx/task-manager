# Task Manager

個人向けのタスク管理アプリ。使い切りのタスクと、再利用可能なチェックリスト（忘れものリストなど）を扱う。

## Language

**Task**:
一度きりの用事を表す、使い切りのToDo。完了すると消費される。
_Avoid_: checklist item

**Folder**:
Task を分類するための入れ物。Checklist は Folder に属さず、Task と並列の独立したセクションとして扱う。

**All**:
Folder への所属に関係なく、すべての Task を表示する絞り込み条件。Folder そのものではない。UI 上の表記は「すべて」。
_Avoid_: All tasks, All, インボックス

**Unclassified**:
どの Folder にも属していない Task のこと、およびそれだけを一覧する絞り込み条件。Folder そのものではないが、現実に存在する所属先であり、移動先としても選べる。UI 上の表記は「未分類」。
_Avoid_: フォルダなし, 無所属

**Checklist**:
何度も使い回す項目の集まり（例：旅行の忘れものリスト）。項目のチェック状態はリセットして再利用できる点が Task との本質的な違い。利用履歴は持たず、チェック状態は「今の一回分」のみ。
_Avoid_: テンプレート, パッキングリスト, todo リスト

**ChecklistItem**:
Checklist を構成する個々の項目。タイトルのみを持ち（Task と同じ）、チェック済み / 未チェックの単一状態を持つ。
_Avoid_: subtask, チェック項目

**Deadline**:
Task に設定できる任意の〆切。日付（時刻なし）で表し、「この日までに完了したい」を示す。Checklist / ChecklistItem は持たず、Task のみが持つ。
_Avoid_: due date, 期限, 期日

**Overdue**:
未完了の Task がその Deadline を過ぎた状態。保存される状態ではなく「今日の日付 > Deadline かつ未完了」から導出される派生値。一覧上で視覚的に強調されるが、Task の状態は増えない。
_Avoid_: 延滞, late

**Reset**:
Checklist の全項目のチェック状態を未チェックに戻す操作。いつでも実行でき、Checklist を再利用する唯一の手段。項目のチェックは個別に何度でも付け外しできる。

**Account**:
Twitter のアカウント。ハンドル（@xxx）で識別する。このアプリでは Twitter のもののみを扱い、Task / Checklist と並ぶ独立したセクションとして管理する。
_Avoid_: Twitter アカウント, X アカウント, フィード

**LastRead**:
ある Account について「この時刻までのツイートを見た」ことを示す時刻。Account ごとに 0 または 1 つだけ存在し、履歴は持たない。次に Twitter を開いたとき「いつ以降を見れば良いか」の再開位置として使う。
_Avoid_: 既読, 最終アクセス, bookmark

**MarkAsRead**:
Account の LastRead を現在時刻で上書きする操作。「今この瞬間まで見た」という宣言。確認なしで実行でき、結果は後から編集で修正できる。
