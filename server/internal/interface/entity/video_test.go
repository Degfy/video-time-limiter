package entity

import (
	"encoding/json"
	"testing"
	"time"
)

func TestX(t *testing.T) {
	now := time.Now()
	marshal, err := json.Marshal(&VideoSubmit{
		At: &now,
	})
	if err != nil {
		panic(err)
	}
	t.Log(string(marshal))
}
