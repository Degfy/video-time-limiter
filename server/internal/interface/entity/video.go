package entity

import "time"

type VideoSubmit struct {
	Url       string     `json:"url"`
	WatchTime int        `json:"watchTime"` //单位：毫秒
	At        *time.Time `json:"at"`
}

type VideoSetting struct {
	LimitTime     int    `json:"limitTime"`     //单位：毫秒
	CustomMessage string `json:"customMessage"` //自定义提示内容
}

type VideoData struct {
	LimitTime     int        `json:"limitTime"`     //单位：毫秒
	WatchTime     int        `json:"watchTime"`     //单位：毫秒
	LastAt        *time.Time `json:"lastAt"`        // 最后更新时间
	CustomMessage string     `json:"customMessage"` //自定义提示内容
}
