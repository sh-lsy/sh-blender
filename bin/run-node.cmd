@echo off
rem Optional fallback launcher for .mcp.json if the host does not expose `node`
rem on PATH. WorkBuddy injects its embedded Node through these variables.
setlocal
if not "%WORKBUDDY_NODE_EXECUTABLE%"=="" (
  "%WORKBUDDY_NODE_EXECUTABLE%" %*
) else if not "%CODEBUDDY_NODE_EXECUTABLE%"=="" (
  "%CODEBUDDY_NODE_EXECUTABLE%" %*
) else (
  node %*
)
endlocal
