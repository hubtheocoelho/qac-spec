#!/bin/sh
#
# QAC commit-msg hook — validates QAC trailers on agent commits (QAC 2.0).
#
# If a commit has no Agent: trailer, it is treated as a human commit and passes.
# If a commit has an Agent: trailer, it must follow the QAC rules:
#   - Agent, Mode, What and Why present, each exactly once
#   - Mode is "hitl" or "auto"
#   - Agent, What and Why are not empty
#   - the four trailers are consecutive lines, in the order Agent, Mode, What, Why
#   - they are in the last block of the message, separated from the subject
#     line (or body) by a blank line; other trailers may only come before
#     Agent or after Why
#
# Install:
#   cp commit-msg-hook.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
#
# Or via core.hooksPath:
#   mkdir -p .githooks && cp commit-msg-hook.sh .githooks/commit-msg
#   chmod +x .githooks/commit-msg
#   git config core.hooksPath .githooks

COMMIT_MSG_FILE="$1"

# When the message comes from an editor, git hands the hook the comment
# template too; git strips those lines (and everything below the scissors
# line) before storing the message, so ignore them here as well.
COMMENT_CHAR=$(git config --get core.commentChar 2>/dev/null)
if [ -z "$COMMENT_CHAR" ] || [ "$COMMENT_CHAR" = "auto" ]; then
  COMMENT_CHAR="#"
fi

awk -v c="$COMMENT_CHAR" '
  index($0, c " ------------------------ >8 ------------------------") == 1 { exit }
  substr($0, 1, length(c)) == c { next }
  { line[++n] = $0 }

  function fail(msg) { errors = errors "\n  - " msg }

  END {
    # Trailing blank lines are not part of the message.
    while (n > 0 && line[n] ~ /^[ \t]*$/) n--

    split("Agent Mode What Why", key, " ")
    for (i = 1; i <= 4; i++) count[key[i]] = 0
    for (j = 1; j <= n; j++) {
      for (i = 1; i <= 4; i++) {
        k = key[i]
        if (index(line[j], k ":") == 1) {
          count[k]++
          pos[k] = j
          v = substr(line[j], length(k) + 2)
          sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v)
          value[k] = v
        }
      }
    }

    # No Agent trailer: a human commit.
    if (count["Agent"] == 0) exit 0

    for (i = 1; i <= 4; i++) {
      k = key[i]
      if (count[k] == 0) fail("missing trailer: " k)
      else if (count[k] > 1) fail("trailer " k " appears " count[k] " times; it must appear exactly once")
    }

    if (errors == "") {
      if (value["Mode"] == "autonomous")
        fail("invalid Mode value: '\''autonomous'\'' was renamed to '\''auto'\'' in QAC 2.0")
      else if (value["Mode"] != "hitl" && value["Mode"] != "auto")
        fail("invalid Mode value: '\''" value["Mode"] "'\'' (must be '\''hitl'\'' or '\''auto'\'')")

      split("Agent What Why", nonempty, " ")
      for (i = 1; i <= 3; i++) if (value[nonempty[i]] == "") fail("trailer " nonempty[i] " is empty")

      if (pos["Agent"] > pos["Mode"] || pos["Mode"] > pos["What"] || pos["What"] > pos["Why"]) {
        fail("trailers must appear in fixed order: Agent, Mode, What, Why")
      } else if (pos["Mode"] != pos["Agent"] + 1 || pos["What"] != pos["Mode"] + 1 || pos["Why"] != pos["What"] + 1) {
        fail("Agent, Mode, What and Why must be consecutive lines: one line each, with nothing between them")
      }

      # Walk back from Agent to the blank line that opens the footer: only
      # other trailers (e.g. a Signed-off-by added by git -s) may precede it.
      s = pos["Agent"] - 1
      bad = 0
      while (s >= 1 && line[s] !~ /^[ \t]*$/) {
        if (line[s] !~ /^[A-Za-z0-9-]+:/ && line[s] !~ /^[ \t]/) { bad = 1; break }
        s--
      }
      if (bad || s < 2)
        fail("the trailers must be separated from the subject line (or body) by a blank line")

      for (j = pos["Why"] + 1; j <= n; j++) {
        if (line[j] ~ /^[ \t]*$/) { fail("the trailers must be the last block of the message: text found after them"); break }
        if (j == pos["Why"] + 1 && line[j] ~ /^[ \t]/) { fail("Why must fit on a single line: continuation line found"); break }
        if (line[j] ~ /^[ \t]/) continue
        if (line[j] !~ /^[A-Za-z0-9-]+:/) { fail("only other trailers (e.g. Co-Authored-By) may follow Why, found: " line[j]); break }
      }
    }

    if (errors == "") exit 0

    printf "QAC: agent commit rejected:%s\n\n", errors
    print "Required footer (last block of the message, one line each):"
    print "  Agent: <agent name>"
    print "  Mode: <hitl | auto>"
    print "  What: <semantic summary>"
    print "  Why: <condition + impact>"
    print "  <optional other trailers, e.g. Co-Authored-By>"
    exit 1
  }
' "$COMMIT_MSG_FILE"
