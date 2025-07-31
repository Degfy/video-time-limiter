package service

import "server/internal/interface/entity"

type IVideo interface {
	Save(userId string, data entity.VideoSubmit) (*entity.VideoData, error)
	Setting(userId string, setting entity.VideoSetting) (*entity.VideoData, error)
	Get(userId string) (*entity.VideoData, error)
}
