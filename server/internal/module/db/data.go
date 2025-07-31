package db

import (
	"encoding/json"
	"github.com/gone-io/gone/v2"
	"os"
	"path"
	"reflect"
	"server/internal/interface/service"
	"server/internal/pkg/e"
	"sync"
	"time"
)

var _ service.IData = (*data)(nil)

type data struct {
	gone.Flag
	file         string        `gone:"config,db.file=data/db.json"`
	saveDuration time.Duration `gone:"config,db.save-duration=10s"`
	logger       gone.Logger   `gone:"*"`

	mu       sync.RWMutex
	keeper   map[string]any
	needSave bool
}

func (s *data) loadFromFile() {
	if _, err := os.Stat(s.file); os.IsNotExist(err) {
		s.logger.Infof("数据文件不存在，将创建新文件: %s", s.file)
		return
	}

	data, err := os.ReadFile(s.file)
	if err != nil {
		s.logger.Errorf("读取数据文件失败: %v", err)
		return
	}

	if err := json.Unmarshal(data, &s.keeper); err != nil {
		s.logger.Errorf("解析数据文件失败: %v", err)
		return
	}

	s.logger.Infof("成功加载 %d 条用户数据", len(s.keeper))
}

func (s *data) saveTofile() {
	s.mu.RLock()
	defer s.mu.RUnlock()

	s.logger.Infof("正在保存数据到文件 %s", s.file)
	data, err := json.Marshal(s.keeper)
	if err != nil {
		s.logger.Errorf("保存数据到文件失败: %v", err)
		return
	}
	if err := os.WriteFile(s.file, data, 0644); err != nil {
		s.logger.Errorf("保存数据到文件失败: %v", err)
		return
	}
}

func (s *data) startPeriodicSave() {
	go func() {
		ticker := time.NewTicker(s.saveDuration)
		defer ticker.Stop()

		dir := path.Dir(s.file)
		if err := os.MkdirAll(dir, os.ModePerm); err != nil {
			s.logger.Errorf("创建目录失败: %v", err)
			return
		}

		for {
			select {
			case <-ticker.C:
				if s.needSave {
					s.saveTofile()
				}
			}
		}
	}()
}

func (s *data) Init() {
	s.keeper = make(map[string]any)
	s.loadFromFile()
	s.startPeriodicSave()
}

func (s *data) Put(key string, value any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	oldV := s.keeper[key]
	s.keeper[key] = value

	go func() {
		if !reflect.DeepEqual(value, oldV) {
			s.needSave = true
		}
	}()
	return nil
}

func (s *data) Get(key string, pv any) error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if a, ok := s.keeper[key]; !ok {
		return e.NotFoundTheKey
	} else {
		marshal, err := json.Marshal(a)
		if err != nil {
			return gone.ToError(err)
		}
		err = json.Unmarshal(marshal, pv)

		//err := mapstructure.Decode(a, pv)
		return gone.ToError(err)
	}
}
