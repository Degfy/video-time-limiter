package controller

import (
	"github.com/gone-io/gone/v2"
	"github.com/gone-io/goner/g"
	"github.com/gone-io/goner/gin"
	"server/internal/interface/entity"
	"server/internal/interface/service"
)

var _ gin.Controller = (*video)(nil)

type video struct {
	gone.Flag
	gin.RouteGroup `gone:"*"`
	iVideo         service.IVideo `gone:"*"`
}

func (s *video) Mount() g.MountError {
	s.Group("/api/v1/videos/:userId").

		//获取数据
		GET("", func(i struct {
			userId string `gone:"http,param"`
		}) (*entity.VideoData, error) {
			return s.iVideo.Get(i.userId)
		}).

		//提交数据
		POST("", func(i struct {
			userId string `gone:"http,param"`
		}, req gin.RequestBody[entity.VideoSubmit]) (*entity.VideoData, error) {
			return s.iVideo.Save(i.userId, req.Get())
		}).

		//设置数据
		PUT("", func(i struct {
			userId string `gone:"http,param"`
		}, req gin.RequestBody[entity.VideoSetting]) (*entity.VideoData, error) {
			return s.iVideo.Setting(i.userId, req.Get())
		})

	return nil
}
