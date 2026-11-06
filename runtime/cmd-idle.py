"""Check that the owned CMD is still alive and is not running another program."""
import ctypes
from ctypes import wintypes
import json
import os
import subprocess
import sys


class ProcessEntry(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD), ("szExeFile", wintypes.WCHAR * 260),
    ]


def inspect_cmd(pid):
    if sys.platform == 'darwin':
        return inspect_posix(pid)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    snapshot = kernel.CreateToolhelp32Snapshot(2, 0)
    if snapshot == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    found = False
    children = []
    try:
        entry = ProcessEntry()
        entry.dwSize = ctypes.sizeof(entry)
        valid = kernel.Process32FirstW(snapshot, ctypes.byref(entry))
        while valid:
            if entry.th32ProcessID == pid:
                found = entry.szExeFile.casefold() == "cmd.exe"
            if entry.th32ParentProcessID == pid and entry.szExeFile.casefold() not in ("conhost.exe", "openconsole.exe"):
                children.append(entry.th32ProcessID)
            valid = kernel.Process32NextW(snapshot, ctypes.byref(entry))
    finally:
        kernel.CloseHandle(snapshot)
    return {"cmd": found, "children": children}


def inspect_posix(pid):
    result = subprocess.run(['/bin/ps', '-axo', 'pid=,ppid=,comm='],
                            check=True, capture_output=True, text=True)
    found, children = False, []
    for line in result.stdout.splitlines():
        fields = line.strip().split(None, 2)
        if len(fields) != 3:
            continue
        process_id, parent = int(fields[0]), int(fields[1])
        if process_id == pid:
            found = os.path.basename(fields[2]).lstrip('-') == 'zsh'
        if parent == pid:
            children.append(process_id)
    return {'cmd': found, 'children': children}


if __name__ == "__main__":
    print(json.dumps(inspect_cmd(int(sys.argv[1]))))
