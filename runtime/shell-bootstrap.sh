# Sourced by the one owned zsh. Never eval file names or interpolate them as code.
# read -d '' reads through NUL, including a directory with embedded newlines.
if IFS= read -r -d '' AUTOCAPTURE_CWD < "$AUTOCAPTURE_FOLDER/cwd.bin"; then
  if builtin cd -- "$AUTOCAPTURE_CWD"; then
    "$AUTOCAPTURE_NODE" "$AUTOCAPTURE_HELPER"
  fi
fi
unset AUTOCAPTURE_CWD
