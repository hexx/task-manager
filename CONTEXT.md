# Task Manager

個人向けのタスク管理アプリ。使い切りのタスクと、再利用可能なチェックリスト（忘れものリストなど）を扱う。

## Language

**Task**:
一度きりの用事を表す、使い切りのToDo。完了すると消費される。
_Avoid_: checklist item

**Folder**:
Task を分類するための入れ物。Checklist は Folder に属さず、Task と並列の独立したセクションとして扱う。

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
