param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GhArgs)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Cred {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags; public int Type;
        [MarshalAs(UnmanagedType.LPWStr)] public string TargetName;
        [MarshalAs(UnmanagedType.LPWStr)] public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        [MarshalAs(UnmanagedType.LPWStr)] public string TargetAlias;
        [MarshalAs(UnmanagedType.LPWStr)] public string Unknown;
    }
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credential);
    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr cred);
}
'@
$target = 'gh:github.com:bgwfsj'
$ptr = [IntPtr]::Zero
if (-not [Cred]::CredRead($target, 1, 0, [ref]$ptr)) {
    throw ('CredRead failed for ' + $target + ' win32err=' + [System.Runtime.InteropServices.Marshal]::GetLastWin32Error())
}
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][Cred+CREDENTIAL])
[Cred]::CredFree($ptr)
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
$token = [System.Text.Encoding]::UTF8.GetString($bytes).Trim()
if (-not $token) { throw 'empty token' }
$env:GH_TOKEN = $token
gh @GhArgs
exit $LASTEXITCODE
