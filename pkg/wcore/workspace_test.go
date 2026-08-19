// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

package wcore

import (
	"testing"

	"github.com/wavetermdev/waveterm/pkg/wconfig"
)

func TestShouldCloseWindowOnLastTabCloseDefaultsToFalse(t *testing.T) {
	if shouldCloseWindowOnLastTabClose(wconfig.SettingsType{}) {
		t.Fatalf("expected closing the last tab to keep the window open by default")
	}
}

func TestShouldCloseWindowOnLastTabCloseRespectsConfig(t *testing.T) {
	settings := wconfig.SettingsType{TabCloseLastTabClosesWindow: true}
	if !shouldCloseWindowOnLastTabClose(settings) {
		t.Fatalf("expected tab:closelasttabcloseswindow=true to close the window")
	}
}
