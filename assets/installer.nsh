!include LogicLib.nsh
!include MUI2.nsh
!include nsDialogs.nsh

!ifndef BUILD_UNINSTALLER
Var StartMenuShortcutCheckbox
Var DesktopShortcutCheckbox
Var ShouldCreateStartMenuShortcut
Var ShouldCreateDesktopShortcut

!macro customPageAfterChangeDir
  Page custom ShortcutOptionsPageCreate ShortcutOptionsPageLeave
!macroend

Function ShortcutOptionsPageCreate
  !insertmacro MUI_HEADER_TEXT "Verknüpfungen" "Wähle aus, welche Verknüpfungen erstellt werden sollen."

  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Du kannst festlegen, ob Apprenticeship Reports im Startmenü und auf dem Desktop verknüpft wird."
  Pop $0

  ${NSD_CreateCheckbox} 0 34u 100% 12u "Startmenü-Verknüpfung erstellen"
  Pop $StartMenuShortcutCheckbox
  ${NSD_Check} $StartMenuShortcutCheckbox

  ${NSD_CreateCheckbox} 0 54u 100% 12u "Desktop-Verknüpfung erstellen"
  Pop $DesktopShortcutCheckbox
  ${NSD_Check} $DesktopShortcutCheckbox

  nsDialogs::Show
FunctionEnd

Function ShortcutOptionsPageLeave
  ${NSD_GetState} $StartMenuShortcutCheckbox $ShouldCreateStartMenuShortcut
  ${NSD_GetState} $DesktopShortcutCheckbox $ShouldCreateDesktopShortcut
FunctionEnd

!macro customInstall
  ${If} $ShouldCreateStartMenuShortcut == ${BST_UNCHECKED}
    Delete "$newStartMenuLink"
    StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    !ifdef MENU_FILENAME
      RMDir "$SMPROGRAMS\${MENU_FILENAME}"
    !endif
  ${EndIf}

  ${If} $ShouldCreateDesktopShortcut == ${BST_UNCHECKED}
    Delete "$newDesktopLink"
  ${EndIf}
!macroend
!endif
