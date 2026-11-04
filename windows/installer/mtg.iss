; mtg.iss — установщик Windows-версии (Inno Setup 6).
;
; Зачем установщик, если есть портативный .exe:
;  1) программа всегда лежит в одном месте (%LOCALAPPDATA%\Programs\MikroTik Gide),
;     поэтому «запустил новый файл, а открылась старая версия» больше не случается;
;  2) установщик сам закрывает запущенную копию (CloseApplications),
;     обновление не упирается в занятый файл;
;  3) появляется запись в «Программах и компонентах» и штатное удаление;
;  4) обновление из программы запускает этот же setup в тихом режиме.
;
; Сборка: ISCC.exe /DAppVersion=1.0.149 /DAppBuild=149 /DSourceExe=path\app.exe mtg.iss
; Переменные передаёт CI (.github/workflows/android.yml, job windows).
; Проверить синтаксис можно и без сборки exe: ISCC /DAppVersion=1.0.0 /DAppBuild=0 /DSourceExe=nul mtg.iss
; (сборка пройдёт до этапа упаковки файлов).

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef AppBuild
  #define AppBuild "0"
#endif
#ifndef SourceExe
  #define SourceExe "..\..\mikrotik-gide-windows.exe"
#endif

#define AppName "MikroTik Gide"
#define AppTitle "MikroTik · Учебник Winbox 4"
#define AppPublisher "MikroTik Gide"
#define AppExe "MikroTikGide.exe"
; AppId менять нельзя: по нему Windows узнаёт «та же программа» и обновляет,
; а не ставит вторую копию рядом.
#define AppId "{{6E2C1B84-3E77-4D0A-9B1C-5B7F0F0D4A11}"

[Setup]
AppId={#AppId}
AppName={#AppTitle}
AppVersion={#AppVersion}
AppVerName={#AppTitle} {#AppVersion} (сборка {#AppBuild})
AppPublisher={#AppPublisher}
VersionInfoVersion={#AppVersion}
VersionInfoProductName={#AppTitle}
VersionInfoDescription=Учебник по настройке роутеров MikroTik
; Установка в профиль пользователя: без UAC и без прав администратора.
DefaultDirName={localappdata}\Programs\MikroTik Gide
DefaultGroupName=MikroTik Gide
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=mikrotik-gide-setup-v{#AppVersion}
SetupIconFile=..\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppTitle}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Закрывает работающую копию перед заменой файлов и не перезапускает её
; в тихом режиме — этим занимается сама программа после обновления.
CloseApplications=yes
RestartApplications=no
; Тихое обновление из программы: /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
; /CLOSEAPPLICATIONS
DisableWelcomePage=no

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Ярлык на рабочем столе"; GroupDescription: "Дополнительно:"
Name: "quicklaunchicon"; Description: "Значок в меню «Пуск»"; GroupDescription: "Дополнительно:"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "{#AppExe}"; Flags: ignoreversion
; README рядом с программой — чтобы было видно, что это и откуда
Source: "..\..\README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme

[Icons]
Name: "{group}\{#AppTitle}"; Filename: "{app}\{#AppExe}"
Name: "{group}\Удалить {#AppTitle}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppTitle}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#AppTitle}"; Filename: "{app}\{#AppExe}"; Tasks: quicklaunchicon

[Run]
; После обычной установки — запустить программу. В тихом режиме (обновление)
; запуском занимается сама программа, здесь только по флагу /RUN.
Filename: "{app}\{#AppExe}"; Description: "Запустить {#AppTitle}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Ничего не удаляем из данных пользователя — там история чтения, избранное,
; сохранённые роутеры и снимки конфигураций. Их можно удалить вручную из
; %LOCALAPPDATA%\MikroTikGide.

[Code]
// Перед установкой показываем, какая версия уже стоит: частая путаница —
// «поставил новую, а открывается старая». Если версия та же, честно говорим.
function GetExistingVersion(): String;
var
  Name: String;
begin
  Result := '';
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#AppId}_is1',
      'DisplayVersion', Name) then
    Result := Name;
end;

function InitializeSetup(): Boolean;
var
  Existing: String;
begin
  Existing := GetExistingVersion();
  if (Existing <> '') and (Existing = '{#AppVersion}') then
  begin
    if MsgBox('Уже установлена эта же версия (' + Existing + ').' + #13#10 +
        'Переустановить её?', mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
      Exit;
    end;
  end;
  Result := True;
end;
