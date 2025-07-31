package video

import (
	"errors"
	"github.com/gone-io/gone/v2"
	"server/internal/interface/entity"
	"server/internal/interface/service"
	"server/internal/pkg/e"
	"sync"
	"time"
)

var _ service.IVideo = (*video)(nil)

type KeyedMutex struct {
	mutexes sync.Map
}

func (m *KeyedMutex) Lock(key string) func() {
	value, _ := m.mutexes.LoadOrStore(key, &sync.Mutex{})
	mtx := value.(*sync.Mutex)
	mtx.Lock()
	return func() { mtx.Unlock() }
}

type video struct {
	gone.Flag
	p      service.IData `gone:"*"`
	logger gone.Logger   `gone:"*"`
	locker KeyedMutex

	defaultLimitTime int `gone:"config,setting.limit-time=60000"`
}

func (s *video) Save(userId string, data entity.VideoSubmit) (*entity.VideoData, error) {
	s.logger.Infof("提交数据：%s=> + %d", userId, data.WatchTime)
	defer s.locker.Lock(userId)()

	d, err := s.Get(userId)
	if err != nil {
		return nil, gone.ToError(err)
	}

	now := time.Now()

	d.WatchTime += data.WatchTime
	d.LastAt = &now
	return d, gone.ToError(s.p.Put(userId, *d))
}

func (s *video) Setting(userId string, setting entity.VideoSetting) (*entity.VideoData, error) {
	defer s.locker.Lock(userId)()

	d, err := s.Get(userId)
	if err != nil {
		return nil, gone.ToError(err)
	}

	d.LimitTime = setting.LimitTime
	if setting.CustomMessage != "" {
		d.CustomMessage = setting.CustomMessage
	}
	return d, gone.ToError(s.p.Put(userId, *d))
}

func (s *video) Get(userId string) (*entity.VideoData, error) {
	var d entity.VideoData
	err := s.p.Get(userId, &d)
	if err != nil {
		if errors.Is(err, e.NotFoundTheKey) {
			d.LimitTime = s.defaultLimitTime
		} else {
			return nil, gone.ToError(err)
		}
	}
	if d.LastAt != nil {
		now := time.Now()
		if now.Format("2006-01-02") != d.LastAt.Format("2006-01-02") {
			d.LastAt = &now
			d.WatchTime = 0
		}
	}
	return &d, nil
}
